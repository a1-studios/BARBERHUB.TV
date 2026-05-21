import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Plus, Trash2, Upload, Link as LinkIcon, Pencil, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GearItem {
  id: string;
  name: string;
  description: string | null;
  price_bb: number;
  stock_quantity: number | null;
  image_url: string | null;
  image_urls: string[] | null;
  is_active: boolean;
  requires_shipping: boolean;
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
  display_order: number;
}

const MAX_IMAGES = 5;

const emptyForm = {
  name: '',
  description: '',
  price_bb: 0,
  stock_quantity: '' as number | '',
  image_urls: [] as string[],
  requires_shipping: false,
  shopify_product_id: '',
  shopify_variant_id: '',
  display_order: 0,
  is_active: true,
};

const GearControlPanel = () => {
  const [items, setItems] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, price_bb, stock_quantity, image_url, image_urls, is_active, requires_shipping, shopify_product_id, shopify_variant_id, display_order')
      .eq('category', 'gear')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load gear');
    else setItems((data || []) as GearItem[]);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    setImageMode('url');
    setUrlInput('');
  };

  const startEdit = (item: GearItem) => {
    setEditingId(item.id);
    const imgs = (item.image_urls && item.image_urls.length > 0)
      ? item.image_urls
      : (item.image_url ? [item.image_url] : []);
    setForm({
      name: item.name,
      description: item.description || '',
      price_bb: item.price_bb,
      stock_quantity: item.stock_quantity ?? '',
      image_urls: imgs.slice(0, MAX_IMAGES),
      requires_shipping: item.requires_shipping,
      shopify_product_id: item.shopify_product_id || '',
      shopify_variant_id: item.shopify_variant_id || '',
      display_order: item.display_order,
      is_active: item.is_active,
    });
    setImageMode('url');
    setUrlInput('');
    setShowForm(true);
  };

  const addImageUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setForm((f) => {
      if (f.image_urls.length >= MAX_IMAGES) {
        toast.error(`Max ${MAX_IMAGES} images`);
        return f;
      }
      if (f.image_urls.includes(trimmed)) return f;
      return { ...f, image_urls: [...f.image_urls, trimmed] };
    });
  };

  const removeImage = (idx: number) => {
    setForm((f) => ({ ...f, image_urls: f.image_urls.filter((_, i) => i !== idx) }));
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    if (form.image_urls.length >= MAX_IMAGES) { toast.error(`Max ${MAX_IMAGES} images`); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('gear-media').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('gear-media').getPublicUrl(path);
      addImageUrl(pub.publicUrl);
      toast.success('Image uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (!form.price_bb || form.price_bb < 0) { toast.error('Price required'); return; }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('admin-upsert-gear', {
      body: {
        action: 'upsert',
        id: editingId,
        payload: {
          name: form.name.trim(),
          description: form.description.trim() || null,
          price_bb: Number(form.price_bb),
          stock_quantity: form.stock_quantity === '' ? null : Number(form.stock_quantity),
          image_url: form.image_urls[0] || null,
          image_urls: form.image_urls,
          requires_shipping: form.requires_shipping,
          shopify_product_id: form.shopify_product_id.trim() || null,
          shopify_variant_id: form.shopify_variant_id.trim() || null,
          display_order: Number(form.display_order) || 0,
          is_active: form.is_active,
        },
      },
    });
    setSaving(false);
    const errMsg = (data as any)?.error || error?.message;
    if (errMsg) { toast.error(errMsg); return; }
    toast.success(editingId ? 'Gear updated' : 'Gear added');
    resetForm();
    fetchItems();
  };

  const toggleActive = async (id: string) => {
    const { error } = await supabase.functions.invoke('admin-upsert-gear', {
      body: { action: 'toggle_active', id },
    });
    if (error) toast.error('Failed'); else fetchItems();
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this gear item?')) return;
    const { error } = await supabase.functions.invoke('admin-upsert-gear', {
      body: { action: 'delete', id },
    });
    if (error) toast.error('Failed to delete'); else { toast.success('Removed'); fetchItems(); }
  };

  const inputClass = 'bg-[#0a0a0f] border-white/10 text-white text-xs';

  return (
    <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Official Gear</h3>
          <span className="text-[10px] text-white/30">{items.length} items</span>
        </div>
        <Button
          onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-7"
        >
          {showForm ? <><X className="h-3 w-3 mr-1" />Cancel</> : <><Plus className="h-3 w-3 mr-1" />Add Gear</>}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-lg border border-white/10 bg-[#0a0a0f] p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            <Input type="number" placeholder="Price (BB) *" value={form.price_bb || ''} onChange={(e) => setForm({ ...form, price_bb: parseInt(e.target.value) || 0 })} className={inputClass} />
          </div>
          <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} min-h-[60px]`} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Stock (blank = unlimited)" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value === '' ? '' : parseInt(e.target.value) })} className={inputClass} />
            <Input type="number" placeholder="Display order" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className={inputClass} />
          </div>

          {/* Image input (up to MAX_IMAGES, rotated 5s on display) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex gap-1">
                <button type="button" onClick={() => setImageMode('upload')} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${imageMode === 'upload' ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/50'}`}>
                  <Upload className="h-3 w-3" />Upload
                </button>
                <button type="button" onClick={() => setImageMode('url')} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${imageMode === 'url' ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/50'}`}>
                  <LinkIcon className="h-3 w-3" />URL
                </button>
              </div>
              <span className="text-[10px] text-white/40">{form.image_urls.length}/{MAX_IMAGES}</span>
            </div>
            {imageMode === 'upload' ? (
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} disabled={uploading || form.image_urls.length >= MAX_IMAGES} className="text-xs text-white/70 file:mr-2 file:rounded file:border-0 file:bg-orange-500 file:text-white file:px-2 file:py-1 file:text-[10px]" />
            ) : (
              <div className="flex gap-1">
                <Input placeholder="https://image.url/photo.jpg" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className={inputClass} />
                <Button type="button" size="sm" onClick={() => { addImageUrl(urlInput); setUrlInput(''); }} disabled={!urlInput.trim() || form.image_urls.length >= MAX_IMAGES} className="h-8 bg-orange-500 hover:bg-orange-600 text-white text-xs px-2">Add</Button>
              </div>
            )}
            {form.image_urls.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {form.image_urls.map((url, i) => (
                  <div key={url + i} className="relative">
                    <img src={url} alt={`#${i + 1}`} className="h-12 w-12 rounded object-cover border border-white/10" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-black/80 text-white text-[10px] leading-none flex items-center justify-center border border-white/10 hover:bg-red-500">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Shopify product ID (opt)" value={form.shopify_product_id} onChange={(e) => setForm({ ...form, shopify_product_id: e.target.value })} className={inputClass} />
            <Input placeholder="Shopify variant ID (opt)" value={form.shopify_variant_id} onChange={(e) => setForm({ ...form, shopify_variant_id: e.target.value })} className={inputClass} />
          </div>

          <div className="flex items-center justify-between text-xs text-white/60">
            <label className="flex items-center gap-2">
              <Switch checked={form.requires_shipping} onCheckedChange={(v) => setForm({ ...form, requires_shipping: v })} />
              Requires shipping
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              Active
            </label>
          </div>

          <Button onClick={save} disabled={saving || uploading} size="sm" className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs">
            {saving ? 'Saving…' : editingId ? 'Update Gear' : 'Add Gear'}
          </Button>
        </div>
      )}

      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {loading ? <p className="text-xs text-white/30">Loading…</p>
        : items.length === 0 ? <p className="text-xs text-white/30">No gear yet. Click "Add Gear" to start.</p>
        : items.map((item) => {
          const previewUrl = (item.image_urls && item.image_urls[0]) || item.image_url;
          const count = (item.image_urls?.length || (item.image_url ? 1 : 0));
          return (
          <div key={item.id} className="flex items-center justify-between bg-[#0a0a0f] rounded-lg px-3 py-2 border border-white/[0.06]">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="h-9 w-9 rounded bg-white/5 overflow-hidden shrink-0">
                {previewUrl && <img src={previewUrl} alt={item.name} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">{item.name}</p>
                <div className="flex items-center gap-2 text-[10px] text-white/40">
                  <span className="text-orange-500 font-semibold">{item.price_bb} BB</span>
                  {count > 0 && <span>· {count} img</span>}
                  {item.stock_quantity !== null && <span>· Stock {item.stock_quantity}</span>}
                  {item.requires_shipping && <span>· Ships</span>}
                  {item.shopify_variant_id && <span>· Shopify</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Switch checked={item.is_active} onCheckedChange={() => toggleActive(item.id)} />
              <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="h-7 w-7 text-white/50 hover:text-white">
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(item.id)} className="h-7 w-7 text-white/30 hover:text-red-400">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default GearControlPanel;
