import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UpgradePrompt } from '@/components/barber/UpgradePrompt';
import { useQuery } from '@tanstack/react-query';
import { 
  Upload, 
  Video, 
  Image, 
  Sparkles, 
  BookOpen, 
  Lightbulb, 
  GraduationCap,
  Megaphone,
  Coins,
  Loader2,
  X,
  CheckCircle
} from 'lucide-react';

const CATEGORIES = [
  { value: 'masterclass', label: 'Masterclass', icon: GraduationCap, color: 'text-yellow-400' },
  { value: 'tutorial', label: 'Tutorial', icon: BookOpen, color: 'text-blue-400' },
  { value: 'tip', label: 'Quick Tip', icon: Lightbulb, color: 'text-green-400' },
];

export function EducatorUpload() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('tip');
  const [promoteToFeed, setPromoteToFeed] = useState(false);
  const [boostBB, setBoostBB] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Check subscription tier
  const { data: barberProfile } = useQuery({
    queryKey: ['barber-profile-tier', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('barber_profiles')
        .select('active_subscription_tier')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const hasSubscription = !!barberProfile?.active_subscription_tier;
  const isVideo = selectedFile?.type.startsWith('video/');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error('File too large — max 100MB');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePublish = async () => {
    if (!user?.id) return;
    if (!title.trim()) {
      toast.error('Add a title');
      return;
    }
    if (!selectedFile) {
      toast.error('Select a file to upload');
      return;
    }

    // Gate on subscription
    if (!hasSubscription) {
      setShowUpgrade(true);
      return;
    }

    setUploading(true);
    try {
      const bucket = isVideo ? 'videos' : 'creations';
      const ext = selectedFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const mediaUrl = urlData.publicUrl;

      // Insert into creator_content
      const { data: content, error: insertError } = await supabase
        .from('creator_content')
        .insert({
          creator_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          content_type: category,
          media_url: mediaUrl,
          status: 'published',
          promote_to_feed: promoteToFeed,
          content_category: category,
          boost_amount_bb: boostBB,
          is_published: true,
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // If promoting to feed, create feed_items entry
      if (promoteToFeed && content) {
        await supabase.from('feed_items').insert({
          content_id: (content as any).id,
          content_type: 'course_teaser',
          source_table: 'creator_content',
          creator_id: user.id,
          is_locked: false,
          rank_score: 500 + boostBB,
          promote_boost: boostBB,
        } as any);
      }

      // Deduct BB if boosting
      if (boostBB > 0) {
        await supabase
          .from('profiles')
          .update({ barber_bucks: supabase.rpc('get_barber_bucks_balance', { user_uuid: user.id }) } as any)
          .eq('user_id', user.id);
      }

      toast.success('Content published! 🎉');
      
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('tip');
      setPromoteToFeed(false);
      setBoostBB(0);
      clearFile();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Upload Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative rounded-2xl border-2 border-dashed border-primary/30 bg-card/50 backdrop-blur cursor-pointer hover:border-primary/60 transition-all overflow-hidden"
          style={{ minHeight: selectedFile ? 'auto' : '200px' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          
          {selectedFile && previewUrl ? (
            <div className="relative">
              {isVideo ? (
                <video
                  src={previewUrl}
                  className="w-full max-h-[280px] object-cover rounded-2xl"
                  controls={false}
                  muted
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full max-h-[280px] object-cover rounded-2xl"
                />
              )}
              <button
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 backdrop-blur border border-border/50"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-3">
                <Badge variant="secondary" className="gap-1 text-xs">
                  {isVideo ? <Video className="w-3 h-3" /> : <Image className="w-3 h-3" />}
                  {selectedFile.name.substring(0, 20)}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] gap-3">
              <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Tap to upload</p>
                <p className="text-xs text-muted-foreground mt-0.5">Video or Image • Max 100MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <Input
          placeholder="Title your content..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-card/50 border-border/30 text-base font-medium"
        />

        {/* Category Selector */}
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-card/30 border-border/20 text-muted-foreground hover:border-border/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : cat.color}`} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Description */}
        <Textarea
          placeholder="Describe your content (optional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-card/50 border-border/30 text-sm min-h-[80px] resize-none"
        />

        {/* Promote to Feed Toggle */}
        <Card className="border-primary/20 bg-card/30">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Promote to Feed</p>
                <p className="text-[10px] text-muted-foreground">Appears in the global discovery scroll</p>
              </div>
            </div>
            <Switch
              checked={promoteToFeed}
              onCheckedChange={setPromoteToFeed}
            />
          </CardContent>
        </Card>

        {/* Boost with BB */}
        {promoteToFeed && (
          <Card className="border-border/20 bg-card/30">
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <div>
                  <p className="text-sm font-medium">Boost Visibility</p>
                  <p className="text-[10px] text-muted-foreground">Spend BB to rank higher</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  value={boostBB}
                  onChange={(e) => setBoostBB(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 h-8 text-sm text-center bg-background/50"
                />
                <span className="text-xs text-muted-foreground font-bold">BB</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Publish Button */}
        <Button
          onClick={handlePublish}
          disabled={uploading || !title.trim() || !selectedFile}
          className="w-full h-12 text-base font-bold rounded-xl bg-primary hover:bg-primary/90"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Publishing...
            </>
          ) : hasSubscription ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Publish
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Publish — Upgrade Required
            </>
          )}
        </Button>
      </div>

      <UpgradePrompt
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason="premium_feature"
        title="Publish to the Global Feed — upgrade to Educator tier"
      />
    </>
  );
}
