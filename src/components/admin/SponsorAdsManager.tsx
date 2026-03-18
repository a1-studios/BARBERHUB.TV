import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSponsorAds, type SponsorAd } from "@/hooks/useSponsorAds";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Sparkles, Upload, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SponsorFormData {
  name: string;
  message: string;
  highlight_end: number;
  logo_url: string;
  product_image_url: string;
  product_image_url_2: string;
  promo_text: string;
  product_link: string;
  link: string;
  display_order: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
}

const DEFAULT_FORM: SponsorFormData = {
  name: "",
  message: "",
  highlight_end: 15,
  logo_url: "",
  product_image_url: "",
  product_image_url_2: "",
  promo_text: "15% off with BB",
  product_link: "",
  link: "",
  display_order: 0,
  is_active: true,
  starts_at: "",
  ends_at: "",
};

export default function SponsorAdsManager() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: sponsors = [], isLoading } = useSponsorAds(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SponsorFormData>(DEFAULT_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const openEdit = (ad: SponsorAd) => {
    setEditingId(ad.id);
    setForm({
      name: ad.name,
      message: ad.message,
      highlight_end: ad.highlight_end,
      logo_url: ad.logo_url ?? "",
      product_image_url: ad.product_image_url ?? "",
      link: ad.link ?? "",
      display_order: ad.display_order,
      is_active: ad.is_active,
      starts_at: ad.starts_at ?? "",
      ends_at: ad.ends_at ?? "",
    });
    setDialogOpen(true);
  };

  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Unsupported file type. Use PNG, JPG, WebP, GIF, or SVG.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("sponsor-logos")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error("Failed to upload logo");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("sponsor-logos")
      .getPublicUrl(path);

    setForm((prev) => ({ ...prev, logo_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("Logo uploaded");
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.message.trim()) {
      toast.error("Name and message are required");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      message: form.message.trim(),
      highlight_end: form.highlight_end,
      logo_url: form.logo_url || null,
      product_image_url: form.product_image_url || null,
      link: form.link || null,
      display_order: form.display_order,
      is_active: form.is_active,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };

    if (editingId) {
      const { error } = await (supabase.from("sponsor_ads" as any) as any)
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast.error("Failed to update sponsor ad");
        setSaving(false);
        return;
      }
      toast.success("Sponsor ad updated");
    } else {
      const { error } = await (supabase.from("sponsor_ads" as any) as any)
        .insert({ ...payload, created_by: user?.id });

      if (error) {
        toast.error("Failed to create sponsor ad");
        setSaving(false);
        return;
      }
      toast.success("Sponsor ad created");
    }

    queryClient.invalidateQueries({ queryKey: ["sponsor-ads"] });
    setDialogOpen(false);
    setSaving(false);
  };

  const handleToggleActive = async (ad: SponsorAd) => {
    const { error } = await (supabase.from("sponsor_ads" as any) as any)
      .update({ is_active: !ad.is_active })
      .eq("id", ad.id);

    if (error) {
      toast.error("Failed to toggle status");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["sponsor-ads"] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from("sponsor_ads" as any) as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete sponsor ad");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["sponsor-ads"] });
    toast.success("Sponsor ad deleted");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Sponsor Ads</h1>
          <p className="text-muted-foreground">Manage Arena Ticker sponsor advertisements</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Sponsor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sponsors</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
          ) : sponsors.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Sparkles className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No sponsor ads yet</p>
              <Button variant="outline" size="sm" onClick={openCreate}>
                Create First Ad
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Message</TableHead>
                  <TableHead className="w-20">Order</TableHead>
                  <TableHead className="w-20">Active</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsors.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell>
                      {ad.logo_url ? (
                        <img
                          src={ad.logo_url}
                          alt={ad.name}
                          className="h-8 w-8 rounded object-contain bg-muted"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{ad.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground truncate max-w-[200px]">
                      {ad.message}
                    </TableCell>
                    <TableCell>{ad.display_order}</TableCell>
                    <TableCell>
                      <Switch
                        checked={ad.is_active}
                        onCheckedChange={() => handleToggleActive(ad)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(ad)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(ad.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Sponsor Ad" : "Create Sponsor Ad"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Brand Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Wahl Pro"
              />
            </div>
            <div>
              <Label htmlFor="message">Ad Message *</Label>
              <Input
                id="message"
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                placeholder="e.g. YOUR BRAND HERE — Premium Sponsor Slot"
              />
            </div>
            <div>
              <Label htmlFor="highlight_end">
                Bold characters (first N chars highlighted)
              </Label>
              <Input
                id="highlight_end"
                type="number"
                min={0}
                value={form.highlight_end}
                onChange={(e) =>
                  setForm((p) => ({ ...p, highlight_end: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
            <div>
              <Label>Logo Image</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt="Logo preview"
                    className="h-10 w-10 rounded object-contain bg-muted border"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center border">
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      <Upload className="w-4 h-4 mr-1" />
                      {uploading ? "Uploading…" : "Upload"}
                    </span>
                  </Button>
                </label>
                {form.logo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm((p) => ({ ...p, logo_url: "" }))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="link">Click-through URL (optional)</Label>
              <Input
                id="link"
                value={form.link}
                onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
                placeholder="https://sponsor-website.com"
              />
            </div>
            {/* Product Image Upload */}
            <div>
              <Label>Product Image (shown in battle theater)</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.product_image_url ? (
                  <img src={form.product_image_url} alt="Product preview" className="h-10 w-10 rounded object-contain bg-muted border" />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center border">
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <Input
                  placeholder="Product image URL"
                  value={form.product_image_url}
                  onChange={(e) => setForm((p) => ({ ...p, product_image_url: e.target.value }))}
                />
                {form.product_image_url && (
                  <Button variant="ghost" size="sm" onClick={() => setForm((p) => ({ ...p, product_image_url: "" }))}>Remove</Button>
                )}
              </div>
            </div>
            {/* Scheduling */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="starts_at">Starts At</Label>
                <Input id="starts_at" type="datetime-local" value={form.starts_at ? form.starts_at.slice(0, 16) : ''} onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value ? new Date(e.target.value).toISOString() : '' }))} />
              </div>
              <div>
                <Label htmlFor="ends_at">Ends At</Label>
                <Input id="ends_at" type="datetime-local" value={form.ends_at ? form.ends_at.slice(0, 16) : ''} onChange={(e) => setForm((p) => ({ ...p, ends_at: e.target.value ? new Date(e.target.value).toISOString() : '' }))} />
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={form.display_order}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, display_order: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(val) => setForm((p) => ({ ...p, is_active: val }))}
                />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editingId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
