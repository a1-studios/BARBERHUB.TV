import { useState, useEffect, useRef } from 'react';
import { Store, Plus, Trash2, Upload, Link as LinkIcon, Pencil, X, ExternalLink } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AffiliateProduct {
  id: string;
  title: string;
  description: string | null;
  merchant_label: string | null;
  price_cents: number;
  image_url: string;
  external_link: string;
  is_active: boolean;
  display_order: number;
}

interface Props { onRefresh: () => void; }

const emptyForm = {
  title: '',
  description: '',
  merchant_label: '',
  price_cents: 0,
  image_url: '',
  external_link: '',
  display_order: 0,
  is_active: true,
};

const AffiliateControlPanel = ({ onRefresh }: Props) => {
  const [enabled, setEnabled] = useState(false);
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('url');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    const [stateRes, productsRes] = await Promise.all([
      supabase.from('platform_state').select('value').eq('key', 'affiliate_network_enabled').single(),
      supabase.from('affiliate_products').select('*').order('display_order', { ascending: true }),
    ]);
    if (stateRes.data) setEnabled(stateRes.data.value === 'true');
    if (productsRes.data) setProducts(productsRes.data as AffiliateProduct[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleAffiliate = async () => {
    const newVal = !enabled;
    const { error } = await supabase.functions.invoke('sovereign-system-control', {
      body: { action: 'toggle_flag', flag_key: 'affiliate_network_enabled', new_value: newVal },
    });
    if (error) { toast.error('Failed to toggle'); }
    else { setEnabled(newVal); toast.success(`Affiliate Network ${newVal ? 'Enabled' : 'Disabled'}`); onRefresh(); }
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    setImageMode('url');
  };

  const startEdit = (p: AffiliateProduct) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      description: p.description || '',
      merchant_label: p.merchant_label || '',
      price_cents: p.price_cents,
      image_url: p.image_url,
      external_link: p.external_link,
      display_order: p.display_order,
      is_active: p.is_active,
    });
    setImageMode('url');
    setShowForm(true);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('affiliate-media').upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('affiliate-media').getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: pub.publicUrl }));
      toast.success('Image uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    if (!form.image_url.trim()) { toast.error('Image required'); return; }
    if (!form.external_link.trim()) { toast.error('External link required'); return; }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('admin-upsert-affiliate', {
      body: {
        action: 'upsert',
        id: editingId,
        payload: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          merchant_label: form.merchant_label.trim() || null,
          price_cents: Number(form.price_cents) || 0,
          image_url: form.image_url.trim(),
          external_link: form.external_link.trim(),
          display_order: Number(form.display_order) || 0,
          is_active: form.is_active,
        },
      },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || 'Save failed');
      return;
    }
    toast.success(editingId ? 'Affiliate updated' : 'Affiliate added');
    resetForm();
    fetchData();
  };

  const toggleActive = async (id: string) => {
    const { error } = await supabase.functions.invoke('admin-upsert-affiliate', {
      body: { action: 'toggle_active', id },
    });
    if (error) toast.error('Failed'); else fetchData();
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this affiliate item?')) return;
    const { error } = await supabase.functions.invoke('admin-upsert-affiliate', {
      body: { action: 'delete', id },
    });
    if (error) toast.error('Failed to delete'); else { toast.success('Removed'); fetchData(); }
  };

  const inputClass = 'bg-[#0a0a0f] border-white/10 text-white text-xs';

  return (
    <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Affiliate Network</h3>
          <span className="text-[10px] text-white/30">{products.length} items</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/40">{enabled ? 'Active' : 'Inactive'}</span>
          <Switch checked={enabled} onCheckedChange={toggleAffiliate} />
          <Button
            onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-7"
          >
            {showForm ? <><X className="h-3 w-3 mr-1" />Cancel</> : <><Plus className="h-3 w-3 mr-1" />Add Link</>}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="mb-4 rounded-lg border border-white/10 bg-[#0a0a0f] p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
            <Input placeholder="Merchant label (e.g. Amazon)" value={form.merchant_label} onChange={(e) => setForm({ ...form, merchant_label: e.target.value })} className={inputClass} />
          </div>
          <Textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} min-h-[60px]`} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Price (cents)" value={form.price_cents || ''} onChange={(e) => setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })} className={inputClass} />
            <Input type="number" placeholder="Display order" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className={inputClass} />
          </div>
          <Input placeholder="External Link * (https://…)" value={form.external_link} onChange={(e) => setForm({ ...form, external_link: e.target.value })} className={inputClass} />

          <div>
            <div className="flex gap-1 mb-1.5">
              <button type="button" onClick={() => setImageMode('upload')} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${imageMode === 'upload' ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/50'}`}>
                <Upload className="h-3 w-3" />Upload
              </button>
              <button type="button" onClick={() => setImageMode('url')} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${imageMode === 'url' ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/50'}`}>
                <LinkIcon className="h-3 w-3" />URL
              </button>
            </div>
            {imageMode === 'upload' ? (
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="text-xs text-white/70 file:mr-2 file:rounded file:border-0 file:bg-orange-500 file:text-white file:px-2 file:py-1 file:text-[10px]" />
            ) : (
              <Input placeholder="https://image.url/photo.jpg" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={inputClass} />
            )}
            {form.image_url && (
              <div className="mt-1.5 flex items-center gap-2">
                <img src={form.image_url} alt="preview" className="h-12 w-12 rounded object-cover border border-white/10" />
                <button type="button" onClick={() => setForm({ ...form, image_url: '' })} className="text-[10px] text-white/40 hover:text-red-400">Clear</button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end text-xs text-white/60">
            <label className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              Active
            </label>
          </div>

          <Button onClick={save} disabled={saving || uploading} size="sm" className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs">
            {saving ? 'Saving…' : editingId ? 'Update Link' : 'Add Link'}
          </Button>
        </div>
      )}

      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {loading ? <p className="text-xs text-white/30">Loading…</p>
        : products.length === 0 ? <p className="text-xs text-white/30">No affiliate products yet. Click "Add Link" to start.</p>
        : products.map((p) => (
          <div key={p.id} className="flex items-center justify-between bg-[#0a0a0f] rounded-lg px-3 py-2 border border-white/[0.06]">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="h-9 w-9 rounded bg-white/5 overflow-hidden shrink-0">
                {p.image_url && <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">{p.title}</p>
                <div className="flex items-center gap-2 text-[10px] text-white/40">
                  <span className="text-orange-500 font-semibold">${(p.price_cents / 100).toFixed(2)}</span>
                  {p.merchant_label && <span>· {p.merchant_label}</span>}
                  <a href={p.external_link} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 hover:text-white">
                    <ExternalLink className="h-2.5 w-2.5" />Link
                  </a>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id)} />
              <Button variant="ghost" size="icon" onClick={() => startEdit(p)} className="h-7 w-7 text-white/50 hover:text-white">
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(p.id)} className="h-7 w-7 text-white/30 hover:text-red-400">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AffiliateControlPanel;
