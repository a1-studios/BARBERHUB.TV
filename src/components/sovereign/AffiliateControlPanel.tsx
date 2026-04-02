import { useState, useEffect } from 'react';
import { Store, Plus, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AffiliateProduct {
  id: string; title: string; price_cents: number; image_url: string; external_link: string; is_active: boolean; display_order: number;
}

interface Props { onRefresh: () => void; }

const AffiliateControlPanel = ({ onRefresh }: Props) => {
  const [enabled, setEnabled] = useState(false);
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProduct, setNewProduct] = useState({ title: '', price_cents: 0, image_url: '', external_link: '' });

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
    const { error } = await supabase.functions.invoke('sovereign-system-control', { body: { action: 'toggle_flag', flag_key: 'affiliate_network_enabled', new_value: newVal } });
    if (error) { toast.error('Failed to toggle'); } else { setEnabled(newVal); toast.success(`Affiliate Network ${newVal ? 'Enabled' : 'Disabled'}`); onRefresh(); }
  };

  const addProduct = async () => {
    if (!newProduct.title || !newProduct.image_url || !newProduct.external_link) { toast.error('Fill all fields'); return; }
    const { error } = await supabase.from('affiliate_products').insert({ title: newProduct.title, price_cents: newProduct.price_cents, image_url: newProduct.image_url, external_link: newProduct.external_link, product_type: 'affiliate', display_order: products.length });
    if (error) { toast.error('Failed to add'); } else { toast.success('Product added'); setNewProduct({ title: '', price_cents: 0, image_url: '', external_link: '' }); fetchData(); }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('affiliate_products').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); } else { toast.success('Product removed'); fetchData(); }
  };

  const inputClass = "bg-[#0a0a0f] border-white/10 text-white text-xs";

  return (
    <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Affiliate Network</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/40">{enabled ? 'Active' : 'Inactive'}</span>
          <Switch checked={enabled} onCheckedChange={toggleAffiliate} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Input placeholder="Title" value={newProduct.title} onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })} className={inputClass} />
        <Input type="number" placeholder="Price (cents)" value={newProduct.price_cents || ''} onChange={(e) => setNewProduct({ ...newProduct, price_cents: parseInt(e.target.value) || 0 })} className={inputClass} />
        <Input placeholder="Image URL" value={newProduct.image_url} onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })} className={inputClass} />
        <Input placeholder="External Link" value={newProduct.external_link} onChange={(e) => setNewProduct({ ...newProduct, external_link: e.target.value })} className={inputClass} />
      </div>
      <Button onClick={addProduct} size="sm" className="mb-4 bg-orange-500 hover:bg-orange-600 text-white text-xs">
        <Plus className="h-3 w-3 mr-1" /> Add Product
      </Button>

      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {loading ? <p className="text-xs text-white/30">Loading…</p>
        : products.length === 0 ? <p className="text-xs text-white/30">No affiliate products yet.</p>
        : products.map((p) => (
          <div key={p.id} className="flex items-center justify-between bg-[#0a0a0f] rounded-lg px-3 py-2 border border-white/[0.06]">
            <div className="flex items-center gap-2 min-w-0">
              <img src={p.image_url} alt={p.title} className="h-8 w-8 rounded object-cover shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{p.title}</p>
                <p className="text-[10px] text-white/30">${(p.price_cents / 100).toFixed(2)}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)} className="shrink-0 text-white/30 hover:text-red-400 h-7 w-7">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AffiliateControlPanel;
