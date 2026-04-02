import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSponsorAds, type SponsorAd } from "@/hooks/useSponsorAds";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Megaphone, Plus, Pencil, Trash2, Upload, Power, PowerOff, Sparkles, Eye, EyeOff, BarChart3, MousePointerClick, Users } from "lucide-react";

interface SponsorFormData {
  name: string; message: string; highlight_end: number; logo_url: string; link: string;
  display_order: number; is_active: boolean; product_image_url: string; product_image_url_2: string;
  promo_text: string; product_link: string;
}

const DEFAULT_FORM: SponsorFormData = {
  name: "", message: "", highlight_end: 15, logo_url: "", link: "", display_order: 0,
  is_active: true, product_image_url: "", product_image_url_2: "", promo_text: "15% off with BB", product_link: "",
};

interface Props { onRefresh: () => void; }

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
      const { data, error } = await (supabase.from("sponsor_ad_clicks" as any) as any).select("sponsor_ad_id, user_id, created_at");
      if (error) throw error;
      const metrics: Record<string, { total: number; unique: Set<string>; last7: number }> = {};
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      for (const row of (data || [])) {
        if (!metrics[row.sponsor_ad_id]) metrics[row.sponsor_ad_id] = { total: 0, unique: new Set(), last7: 0 };
        metrics[row.sponsor_ad_id].total++;
        if (row.user_id) metrics[row.sponsor_ad_id].unique.add(row.user_id);
        if (row.created_at >= sevenDaysAgo) metrics[row.sponsor_ad_id].last7++;
      }
      const result: Record<string, { total: number; unique: number; last7: number }> = {};
      for (const [id, m] of Object.entries(metrics)) result[id] = { total: m.total, unique: m.unique.size, last7: m.last7 };
      setClickMetrics(result);
    } catch {} setMetricsLoading(false);
  };

  useEffect(() => { fetchMetrics(); }, [sponsors]);

  const totalClicks = Object.values(clickMetrics).reduce((s, m) => s + m.total, 0);
  const totalUnique = Object.values(clickMetrics).reduce((s, m) => s + m.unique, 0);
  const totalLast7 = Object.values(clickMetrics).reduce((s, m) => s + m.last7, 0);

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ["sponsor-ads"] }); onRefresh(); };

  const openCreate = () => { setEditingId(null); setForm(DEFAULT_FORM); setDialogOpen(true); };
  const openEdit = (ad: SponsorAd) => {
    setEditingId(ad.id);
    setForm({ name: ad.name, message: ad.message, highlight_end: ad.highlight_end, logo_url: ad.logo_url ?? "", link: ad.link ?? "",
      display_order: ad.display_order, is_active: ad.is_active, product_image_url: ad.product_image_url ?? "",
      product_image_url_2: ad.product_image_url_2 ?? "", promo_text: ad.promo_text ?? "15% off with BB", product_link: ad.product_link ?? "" });
    setDialogOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("sponsor-logos").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("sponsor-logos").getPublicUrl(path);
    setForm((p) => ({ ...p, logo_url: urlData.publicUrl }));
    setUploading(false); toast.success("Media uploaded");
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.message.trim()) { toast.error("Name and message required"); return; }
    setSaving(true);
    const payload = { name: form.name.trim(), message: form.message.trim(), highlight_end: form.highlight_end, logo_url: form.logo_url || null,
      link: form.link || null, display_order: form.display_order, is_active: form.is_active, product_image_url: form.product_image_url || null,
      product_image_url_2: form.product_image_url_2 || null, promo_text: form.promo_text || null, product_link: form.product_link || null };
    if (editingId) {
      const { error } = await (supabase.from("sponsor_ads" as any) as any).update(payload).eq("id", editingId);
      if (error) { toast.error("Update failed"); setSaving(false); return; }
      toast.success("Sponsor updated");
    } else {
      const { error } = await (supabase.from("sponsor_ads" as any) as any).insert({ ...payload, created_by: user?.id });
      if (error) { toast.error("Create failed"); setSaving(false); return; }
      toast.success("Sponsor created");
    }
    invalidate(); setDialogOpen(false); setSaving(false);
  };

  const handleToggle = async (ad: SponsorAd) => {
    const { error } = await (supabase.from("sponsor_ads" as any) as any).update({ is_active: !ad.is_active }).eq("id", ad.id);
    if (error) toast.error("Toggle failed"); else invalidate();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase.from("sponsor_ads" as any) as any).delete().eq("id", deleteTarget);
    if (error) toast.error("Delete failed"); else { toast.success("Sponsor deleted"); invalidate(); }
    setDeleteTarget(null);
  };

  const handleBulkDeactivate = async () => {
    setBulkToggling(true);
    const { error } = await (supabase.from("sponsor_ads" as any) as any).update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) toast.error("Failed"); else { toast.success("All sponsors deactivated"); invalidate(); }
    setBulkToggling(false);
  };

  const handleBulkActivate = async () => {
    setBulkToggling(true);
    const { error } = await (supabase.from("sponsor_ads" as any) as any).update({ is_active: true }).neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) toast.error("Failed"); else { toast.success("All sponsors activated"); invalidate(); }
    setBulkToggling(false);
  };

  const inputClass = "bg-[#0a0a0f] border-white/10 text-white";

  return (
    <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Sponsor Board</h3>
        </div>
        <Button size="sm" onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
          <Plus className="w-3 h-3 mr-1" /> Add Sponsor
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: sponsors.length },
          { label: 'Active', value: activeCount },
          { label: 'Inactive', value: inactiveCount },
        ].map((s, i) => (
          <div key={i} className="bg-[#0a0a0f] rounded-lg p-3 text-center border border-white/[0.06]">
            <p className="text-xl font-semibold text-white">{s.value}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Engagement */}
      <div className="bg-[#0a0a0f] rounded-lg p-4 space-y-3 border border-white/[0.06]">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-orange-500" />
          <h4 className="text-xs font-semibold text-white">Engagement</h4>
          <Button size="sm" variant="ghost" onClick={fetchMetrics} disabled={metricsLoading} className="ml-auto text-[10px] text-white/30 hover:text-white">
            {metricsLoading ? "Loading…" : "Refresh"}
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: MousePointerClick, label: 'Total Clicks', value: totalClicks },
            { icon: Users, label: 'Unique', value: totalUnique },
            { icon: BarChart3, label: 'Last 7 Days', value: totalLast7 },
          ].map((m, i) => (
            <div key={i} className="bg-[#12121a] rounded-lg p-2 text-center">
              <m.icon className="w-3.5 h-3.5 mx-auto text-white/20 mb-1" />
              <p className="text-base font-semibold text-white">{m.value}</p>
              <p className="text-[10px] text-white/30">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleBulkDeactivate} disabled={bulkToggling || activeCount === 0} className="border-white/10 text-red-400 hover:bg-white/[0.04] text-xs">
          <PowerOff className="w-3 h-3 mr-1" /> Kill All
        </Button>
        <Button size="sm" variant="outline" onClick={handleBulkActivate} disabled={bulkToggling || inactiveCount === 0} className="border-white/10 text-white hover:bg-white/[0.04] text-xs">
          <Power className="w-3 h-3 mr-1" /> Activate All
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-white/30 text-center py-6">Loading…</p>
      : sponsors.length === 0 ? (
        <div className="text-center py-8">
          <Sparkles className="w-8 h-8 mx-auto text-white/10 mb-2" />
          <p className="text-sm text-white/30">No sponsor ads configured</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {sponsors.map((ad) => (
            <div key={ad.id} className={`flex items-center gap-3 bg-[#0a0a0f] rounded-lg p-3 border ${ad.is_active ? "border-white/[0.06]" : "border-white/[0.03] opacity-50"}`}>
              {ad.logo_url ? <img src={ad.logo_url} alt={ad.name} className="h-10 w-10 rounded object-contain bg-white/[0.04]" />
              : <div className="h-10 w-10 rounded bg-white/[0.04] flex items-center justify-center"><Sparkles className="w-4 h-4 text-white/10" /></div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{ad.name}</p>
                <p className="text-xs text-white/30 truncate">{ad.message}</p>
                {clickMetrics[ad.id] && (
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] text-white/40 font-mono">{clickMetrics[ad.id].total} clicks</span>
                    <span className="text-[10px] text-white/30 font-mono">{clickMetrics[ad.id].unique} unique</span>
                    <span className="text-[10px] text-white/30 font-mono">{clickMetrics[ad.id].last7} 7d</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-white/20 font-mono w-8 text-center">#{ad.display_order}</span>
              <button onClick={() => handleToggle(ad)} className="p-1">
                {ad.is_active ? <Eye className="w-4 h-4 text-white/40" /> : <EyeOff className="w-4 h-4 text-white/20" />}
              </button>
              <button onClick={() => openEdit(ad)} className="p-1"><Pencil className="w-4 h-4 text-white/30 hover:text-white" /></button>
              <button onClick={() => setDeleteTarget(ad.id)} className="p-1"><Trash2 className="w-4 h-4 text-white/30 hover:text-red-400" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-[#12121a] border-white/[0.06] text-white">
          <DialogHeader><DialogTitle>{editingId ? "Edit Sponsor" : "Add Sponsor"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-white/40 text-xs">Brand Name *</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Wahl Pro" className={inputClass} /></div>
            <div><Label className="text-white/40 text-xs">Ad Message *</Label><Input value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} className={inputClass} /></div>
            <div><Label className="text-white/40 text-xs">Bold characters</Label><Input type="number" min={0} value={form.highlight_end} onChange={(e) => setForm((p) => ({ ...p, highlight_end: parseInt(e.target.value) || 0 }))} className={inputClass} /></div>
            <div>
              <Label className="text-white/40 text-xs">Logo / Media</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.logo_url ? <img src={form.logo_url} alt="Preview" className="h-10 w-10 rounded object-contain bg-white/[0.04] border border-white/10" />
                : <div className="h-10 w-10 rounded bg-white/[0.04] flex items-center justify-center border border-white/10"><Sparkles className="w-4 h-4 text-white/10" /></div>}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                  <Button variant="outline" size="sm" asChild disabled={uploading} className="border-white/10 text-white/60"><span><Upload className="w-4 h-4 mr-1" />{uploading ? "Uploading…" : "Upload"}</span></Button>
                </label>
                {form.logo_url && <Button variant="ghost" size="sm" onClick={() => setForm((p) => ({ ...p, logo_url: "" }))} className="text-red-400">Remove</Button>}
              </div>
            </div>
            <div><Label className="text-white/40 text-xs">Click-through URL</Label><Input value={form.link} onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))} className={inputClass} /></div>
            <div><Label className="text-white/40 text-xs">Product Image 1</Label><Input value={form.product_image_url} onChange={(e) => setForm((p) => ({ ...p, product_image_url: e.target.value }))} className={inputClass} /></div>
            <div><Label className="text-white/40 text-xs">Product Image 2</Label><Input value={form.product_image_url_2} onChange={(e) => setForm((p) => ({ ...p, product_image_url_2: e.target.value }))} className={inputClass} /></div>
            <div><Label className="text-white/40 text-xs">Promo Text</Label><Input value={form.promo_text} onChange={(e) => setForm((p) => ({ ...p, promo_text: e.target.value }))} className={inputClass} /></div>
            <div><Label className="text-white/40 text-xs">Product Link</Label><Input value={form.product_link} onChange={(e) => setForm((p) => ({ ...p, product_link: e.target.value }))} className={inputClass} /></div>
            <div className="flex items-center gap-4">
              <div className="flex-1"><Label className="text-white/40 text-xs">Display Order</Label><Input type="number" value={form.display_order} onChange={(e) => setForm((p) => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} className={inputClass} /></div>
              <div className="flex items-center gap-2 pt-5"><Switch checked={form.is_active} onCheckedChange={(val) => setForm((p) => ({ ...p, is_active: val }))} /><Label className="text-white/40 text-xs">Active</Label></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/10 text-white/40">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600">{saving ? "Saving…" : editingId ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#12121a] border-white/[0.06] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sponsor Ad?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/40">This permanently removes the sponsor ad.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white/40 bg-transparent">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
