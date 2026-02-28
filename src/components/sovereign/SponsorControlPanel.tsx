import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSponsorAds, type SponsorAd } from "@/hooks/useSponsorAds";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Power,
  PowerOff,
  Shield,
  Sparkles,
  Eye,
  EyeOff,
  BarChart3,
  MousePointerClick,
  Users,
} from "lucide-react";

interface SponsorFormData {
  name: string;
  message: string;
  highlight_end: number;
  logo_url: string;
  link: string;
  display_order: number;
  is_active: boolean;
}

const DEFAULT_FORM: SponsorFormData = {
  name: "",
  message: "",
  highlight_end: 15,
  logo_url: "",
  link: "",
  display_order: 0,
  is_active: true,
};

interface Props {
  onRefresh: () => void;
}

export default function SponsorControlPanel({ onRefresh }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: sponsors = [], isLoading } = useSponsorAds(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SponsorFormData>(DEFAULT_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkToggling, setBulkToggling] = useState(false);
  const [clickMetrics, setClickMetrics] = useState<Record<string, { total: number; unique: number; last7: number }>>({});
  const [metricsLoading, setMetricsLoading] = useState(false);

  const activeCount = sponsors.filter((s) => s.is_active).length;
  const inactiveCount = sponsors.length - activeCount;

  const fetchMetrics = async () => {
    setMetricsLoading(true);
    try {
      const { data, error } = await (supabase.from("sponsor_ad_clicks" as any) as any)
        .select("sponsor_ad_id, user_id, created_at");
      if (error) throw error;

      const metrics: Record<string, { total: number; unique: Set<string>; last7: number }> = {};
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      for (const row of (data || [])) {
        if (!metrics[row.sponsor_ad_id]) {
          metrics[row.sponsor_ad_id] = { total: 0, unique: new Set(), last7: 0 };
        }
        metrics[row.sponsor_ad_id].total++;
        if (row.user_id) metrics[row.sponsor_ad_id].unique.add(row.user_id);
        if (row.created_at >= sevenDaysAgo) metrics[row.sponsor_ad_id].last7++;
      }

      const result: Record<string, { total: number; unique: number; last7: number }> = {};
      for (const [id, m] of Object.entries(metrics)) {
        result[id] = { total: m.total, unique: m.unique.size, last7: m.last7 };
      }
      setClickMetrics(result);
    } catch {
      // Sovereign role required
    }
    setMetricsLoading(false);
  };

  useEffect(() => {
    fetchMetrics();
  }, [sponsors]);

  const totalClicks = Object.values(clickMetrics).reduce((s, m) => s + m.total, 0);
  const totalUnique = new Set(Object.values(clickMetrics).flatMap(() => [])).size || Object.values(clickMetrics).reduce((s, m) => s + m.unique, 0);
  const totalLast7 = Object.values(clickMetrics).reduce((s, m) => s + m.last7, 0);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sponsor-ads"] });
    onRefresh();
  };

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
      link: ad.link ?? "",
      display_order: ad.display_order,
      is_active: ad.is_active,
    });
    setDialogOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("sponsor-logos")
      .upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("sponsor-logos")
      .getPublicUrl(path);
    setForm((p) => ({ ...p, logo_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("Media uploaded");
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
      link: form.link || null,
      display_order: form.display_order,
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await (supabase.from("sponsor_ads" as any) as any)
        .update(payload)
        .eq("id", editingId);
      if (error) {
        toast.error("Update failed");
        setSaving(false);
        return;
      }
      toast.success("Sponsor updated — SOVEREIGN OVERRIDE");
    } else {
      const { error } = await (supabase.from("sponsor_ads" as any) as any)
        .insert({ ...payload, created_by: user?.id });
      if (error) {
        toast.error("Create failed");
        setSaving(false);
        return;
      }
      toast.success("Sponsor created — SOVEREIGN OVERRIDE");
    }
    invalidate();
    setDialogOpen(false);
    setSaving(false);
  };

  const handleToggle = async (ad: SponsorAd) => {
    const { error } = await (supabase.from("sponsor_ads" as any) as any)
      .update({ is_active: !ad.is_active })
      .eq("id", ad.id);
    if (error) {
      toast.error("Toggle failed");
      return;
    }
    invalidate();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase.from("sponsor_ads" as any) as any)
      .delete()
      .eq("id", deleteTarget);
    if (error) {
      toast.error("Delete failed");
    } else {
      toast.success("Sponsor deleted — SOVEREIGN OVERRIDE");
      invalidate();
    }
    setDeleteTarget(null);
  };

  const handleBulkDeactivate = async () => {
    setBulkToggling(true);
    const { error } = await (supabase.from("sponsor_ads" as any) as any)
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000"); // match all
    if (error) {
      toast.error("Bulk deactivate failed");
    } else {
      toast.success("All sponsors deactivated — KILL SWITCH");
      invalidate();
    }
    setBulkToggling(false);
  };

  const handleBulkActivate = async () => {
    setBulkToggling(true);
    const { error } = await (supabase.from("sponsor_ads" as any) as any)
      .update({ is_active: true })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast.error("Bulk activate failed");
    } else {
      toast.success("All sponsors activated — SOVEREIGN OVERRIDE");
      invalidate();
    }
    setBulkToggling(false);
  };

  return (
    <div className="bg-[#1a1a2e] border border-gray-800 rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-lg">
            <Megaphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              SPONSOR BOARD CONTROL
              <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-mono">
                SOVEREIGN OVERRIDE
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              Full control over Arena Ticker sponsor ads
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Sponsor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0f0f1a] rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-white">{sponsors.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-[#0f0f1a] rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="bg-[#0f0f1a] rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{inactiveCount}</p>
          <p className="text-xs text-gray-500">Inactive</p>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="bg-[#0f0f1a] rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white">ENGAGEMENT METRICS</h3>
          <Button size="sm" variant="ghost" onClick={fetchMetrics} disabled={metricsLoading} className="ml-auto text-xs text-gray-400">
            {metricsLoading ? "Loading…" : "Refresh"}
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1a1a2e] rounded-lg p-2 text-center">
            <MousePointerClick className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
            <p className="text-lg font-bold text-white">{totalClicks}</p>
            <p className="text-[10px] text-gray-500">Total Clicks</p>
          </div>
          <div className="bg-[#1a1a2e] rounded-lg p-2 text-center">
            <Users className="w-4 h-4 mx-auto text-green-400 mb-1" />
            <p className="text-lg font-bold text-white">{totalUnique}</p>
            <p className="text-[10px] text-gray-500">Unique Clickers</p>
          </div>
          <div className="bg-[#1a1a2e] rounded-lg p-2 text-center">
            <BarChart3 className="w-4 h-4 mx-auto text-yellow-400 mb-1" />
            <p className="text-lg font-bold text-white">{totalLast7}</p>
            <p className="text-[10px] text-gray-500">Last 7 Days</p>
          </div>
        </div>
      </div>

      {/* Bulk Controls */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleBulkDeactivate}
          disabled={bulkToggling || activeCount === 0}
          className="border-red-800 text-red-400 hover:bg-red-900/30"
        >
          <PowerOff className="w-3 h-3 mr-1" /> Kill All
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleBulkActivate}
          disabled={bulkToggling || inactiveCount === 0}
          className="border-green-800 text-green-400 hover:bg-green-900/30"
        >
          <Power className="w-3 h-3 mr-1" /> Activate All
        </Button>
      </div>

      {/* Sponsor List */}
      {isLoading ? (
        <p className="text-sm text-gray-500 text-center py-6">Loading…</p>
      ) : sponsors.length === 0 ? (
        <div className="text-center py-8">
          <Sparkles className="w-8 h-8 mx-auto text-gray-600 mb-2" />
          <p className="text-sm text-gray-500">No sponsor ads configured</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {sponsors.map((ad) => (
            <div
              key={ad.id}
              className={`flex items-center gap-3 bg-[#0f0f1a] rounded-lg p-3 border ${
                ad.is_active ? "border-gray-800" : "border-red-900/40 opacity-60"
              }`}
            >
              {/* Logo */}
              {ad.logo_url ? (
                <img
                  src={ad.logo_url}
                  alt={ad.name}
                  className="h-10 w-10 rounded object-contain bg-gray-800"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-gray-800 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-gray-600" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {ad.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{ad.message}</p>
                {clickMetrics[ad.id] && (
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] text-cyan-400 font-mono">{clickMetrics[ad.id].total} clicks</span>
                    <span className="text-[10px] text-green-400 font-mono">{clickMetrics[ad.id].unique} unique</span>
                    <span className="text-[10px] text-yellow-400 font-mono">{clickMetrics[ad.id].last7} 7d</span>
                  </div>
                )}
              </div>

              {/* Order */}
              <span className="text-xs text-gray-600 font-mono w-8 text-center">
                #{ad.display_order}
              </span>

              {/* Status */}
              <button
                onClick={() => handleToggle(ad)}
                className="p-1"
                title={ad.is_active ? "Deactivate" : "Activate"}
              >
                {ad.is_active ? (
                  <Eye className="w-4 h-4 text-green-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-red-400" />
                )}
              </button>

              {/* Edit */}
              <button onClick={() => openEdit(ad)} className="p-1">
                <Pencil className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>

              {/* Delete */}
              <button onClick={() => setDeleteTarget(ad.id)} className="p-1">
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-[#1a1a2e] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? "Edit Sponsor" : "Add Sponsor"}
              <Shield className="w-4 h-4 text-yellow-400" />
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-400">Brand Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Wahl Pro"
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400">Ad Message *</Label>
              <Input
                value={form.message}
                onChange={(e) =>
                  setForm((p) => ({ ...p, message: e.target.value }))
                }
                placeholder="YOUR BRAND HERE — Premium Sponsor Slot"
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400">
                Bold characters (first N highlighted)
              </Label>
              <Input
                type="number"
                min={0}
                value={form.highlight_end}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    highlight_end: parseInt(e.target.value) || 0,
                  }))
                }
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400">Logo / Media</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt="Preview"
                    className="h-10 w-10 rounded object-contain bg-gray-800 border border-gray-700"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-gray-800 flex items-center justify-center border border-gray-700">
                    <Sparkles className="w-4 h-4 text-gray-600" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={uploading}
                    className="border-gray-700 text-gray-300"
                  >
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
                    className="text-red-400"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label className="text-gray-400">Click-through URL</Label>
              <Input
                value={form.link}
                onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
                placeholder="https://sponsor-website.com"
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-gray-400">Display Order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      display_order: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="bg-[#0f0f1a] border-gray-700 text-white"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(val) =>
                    setForm((p) => ({ ...p, is_active: val }))
                  }
                />
                <Label className="text-gray-400">Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {saving ? "Saving…" : editingId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-[#1a1a2e] border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sponsor Ad?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This permanently removes the sponsor ad. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
