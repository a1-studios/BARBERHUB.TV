import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { DmcaCertificationCheckbox } from '@/components/legal/DmcaCertificationCheckbox';

interface CreationUploadProps {
  onCreationUploaded?: () => void;
  barberProfileId?: string;
}

export function CreationUpload({ onCreationUploaded, barberProfileId }: CreationUploadProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dmcaCertified, setDmcaCertified] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: ''
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('creations')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('creations')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !barberProfileId || !imageFile) {
      toast.error('Missing required information');
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      // Upload image to storage
      const mediaUrl = await uploadImage(imageFile);

      // Create creation record
      const { error } = await supabase
        .from('creations')
        .insert({
          barber_id: barberProfileId,
          media_url: mediaUrl,
          title: formData.title || null,
          description: formData.description || null,
          category: formData.category || null
        });

      if (error) throw error;

      toast.success('Creation uploaded successfully!');
      
      // Reset form
      setFormData({ title: '', description: '', category: '' });
      setImageFile(null);
      setImagePreview(null);
      
      onCreationUploaded?.();
    } catch (error: any) {
      console.error('Error uploading creation:', error);
      toast.error(error.message || 'Failed to upload creation');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload New Creation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div>
            <Label htmlFor="image">Image *</Label>
            {!imagePreview ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label htmlFor="image" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click to upload an image
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Max size: 5MB
                  </p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full aspect-square object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Give your creation a title"
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fade">Fade</SelectItem>
                <SelectItem value="classic">Classic Cut</SelectItem>
                <SelectItem value="beard">Beard Work</SelectItem>
                <SelectItem value="color">Color</SelectItem>
                <SelectItem value="texture">Texture</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="before-after">Before & After</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your work, techniques used, inspiration..."
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading || !imageFile} 
            className="w-full"
          >
            {uploading ? 'Uploading...' : 'Upload Creation'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}