import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Upload, X, Eye, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { uploadPortfolioImage } from '@/lib/storage';
import { toast } from 'sonner';

interface PortfolioImage {
  id: string;
  url: string;
  title?: string;
  category?: string;
  order: number;
}

interface PortfolioManagerProps {
  barberId?: string;
  readonly?: boolean;
}

export function PortfolioManager({ barberId, readonly = false }: PortfolioManagerProps) {
  const { user } = useAuth();
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<PortfolioImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Fades', 'Classic Cuts', 'Beard Styling', 'Hair Color', 'Creative Styles', 'Before/After'];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    setUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not an image file`);
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} is too large (max 10MB)`);
        }

        const publicUrl = await uploadPortfolioImage(file, user.id);

        const newImage: PortfolioImage = {
          id: crypto.randomUUID(),
          url: publicUrl,
          title: file.name.split('.')[0],
          category: 'Uncategorized',
          order: images.length + 1,
        };

        return newImage;
      } catch (error: any) {
        toast.error(error.message);
        return null;
      }
    });

    try {
      const uploadedImages = (await Promise.all(uploadPromises)).filter(Boolean) as PortfolioImage[];
      setImages(prev => [...prev, ...uploadedImages]);
      
      if (uploadedImages.length > 0) {
        toast.success(`Successfully uploaded ${uploadedImages.length} image(s)`);
      }
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload some images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    toast.success('Image removed');
  };

  const updateImageDetails = (imageId: string, updates: Partial<PortfolioImage>) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, ...updates } : img
    ));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Portfolio Gallery
            </CardTitle>
            <CardDescription>
              Showcase your best work and attract more clients
            </CardDescription>
          </div>
          
          {!readonly && (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Images
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {images.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No images yet</h3>
            <p className="text-muted-foreground mb-4">
              {readonly 
                ? 'This barber hasn\'t uploaded any portfolio images yet' 
                : 'Upload your best work to showcase your skills'
              }
            </p>
            {!readonly && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Image
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={image.url}
                    alt={image.title || 'Portfolio image'}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedImage(image)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>{selectedImage?.title || 'Portfolio Image'}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <img
                              src={selectedImage?.url}
                              alt={selectedImage?.title || 'Portfolio image'}
                              className="w-full max-h-96 object-contain rounded-lg"
                            />
                            {!readonly && selectedImage && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="image-title">Title</Label>
                                  <Input
                                    id="image-title"
                                    value={selectedImage.title || ''}
                                    onChange={(e) => updateImageDetails(selectedImage.id, { title: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="image-category">Category</Label>
                                  <select 
                                    id="image-category"
                                    className="w-full p-2 border rounded-md"
                                    value={selectedImage.category || ''}
                                    onChange={(e) => updateImageDetails(selectedImage.id, { category: e.target.value })}
                                  >
                                    <option value="">Select category</option>
                                    {categories.map(cat => (
                                      <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {!readonly && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveImage(image.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Image info */}
                <div className="mt-2">
                  <p className="text-sm font-medium truncate">{image.title}</p>
                  {image.category && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {image.category}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}
