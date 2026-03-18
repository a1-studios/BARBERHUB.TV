import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, X, Check } from 'lucide-react';

interface ServiceForm {
  service_name: string;
  price_bb: number;
  duration_minutes: number;
  deposit_bb: number;
  allows_sos: boolean;
  allows_house_call: boolean;
  is_free_intro: boolean;
}

const emptyForm: ServiceForm = {
  service_name: '',
  price_bb: 0,
  duration_minutes: 30,
  deposit_bb: 0,
  allows_sos: false,
  allows_house_call: false,
  is_free_intro: false,
};

export function ServicesManager({ barberId }: { barberId: string | undefined }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<ServiceForm>(emptyForm);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['barber-services-manage', barberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_services')
        .select('*')
        .eq('barber_id', barberId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!barberId,
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ id, ...form }: ServiceForm & { id?: string }) => {
      if (!barberId || !user?.id) throw new Error('Missing IDs');
      const payload = {
        ...form,
        barber_id: barberId,
        barber_user_id: user.id,
        is_active: true,
      };
      if (id) {
        const { error } = await supabase.from('barber_services').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('barber_services').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-services-manage', barberId] });
      toast.success(editingId ? 'Service updated' : 'Service added');
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('barber_services').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-services-manage', barberId] });
      toast.success('Service removed');
    },
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowAdd(false);
  };

  const startEdit = (svc: any) => {
    setForm({
      service_name: svc.service_name,
      price_bb: svc.price_bb,
      duration_minutes: svc.duration_minutes,
      deposit_bb: svc.deposit_bb,
      allows_sos: svc.allows_sos,
      allows_house_call: svc.allows_house_call,
      is_free_intro: svc.is_free_intro,
    });
    setEditingId(svc.id);
    setShowAdd(true);
  };

  const handleSubmit = () => {
    if (!form.service_name.trim()) return toast.error('Service name required');
    upsertMutation.mutate({ ...form, id: editingId || undefined });
  };

  if (isLoading) return <div className="animate-pulse h-20 bg-muted rounded-lg" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">My Services</h4>
        {!showAdd && (
          <Button size="sm" variant="outline" onClick={() => { resetForm(); setShowAdd(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        )}
      </div>

      {/* Existing services */}
      {services.filter(s => s.is_active).map((svc) => (
        <Card key={svc.id} className="p-3 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{svc.service_name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{svc.price_bb} BB</span>
              <span>·</span>
              <span>{svc.duration_minutes} min</span>
              {svc.is_free_intro && <Badge variant="secondary" className="text-[10px] h-4">Free Intro</Badge>}
              {svc.allows_sos && <Badge variant="destructive" className="text-[10px] h-4">SOS</Badge>}
              {svc.allows_house_call && <Badge variant="outline" className="text-[10px] h-4">House Call</Badge>}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(svc)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(svc.id)} disabled={deleteMutation.isPending}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      ))}

      {services.filter(s => s.is_active).length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground italic text-center py-4">No services yet. Add your first service above.</p>
      )}

      {/* Add/Edit form */}
      {showAdd && (
        <Card className="p-4 space-y-3 border-primary/30">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{editingId ? 'Edit Service' : 'New Service'}</p>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </div>
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={form.service_name} onChange={e => setForm(p => ({ ...p, service_name: e.target.value }))} placeholder="e.g., Classic Fade" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Price (BB)</Label>
              <Input type="number" min={0} value={form.price_bb} onChange={e => setForm(p => ({ ...p, price_bb: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label className="text-xs">Duration (min)</Label>
              <Input type="number" min={15} step={15} value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 30 }))} />
            </div>
            <div>
              <Label className="text-xs">Deposit (BB)</Label>
              <Input type="number" min={0} value={form.deposit_bb} onChange={e => setForm(p => ({ ...p, deposit_bb: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={form.allows_sos} onCheckedChange={v => setForm(p => ({ ...p, allows_sos: v }))} /> SOS
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={form.allows_house_call} onCheckedChange={v => setForm(p => ({ ...p, allows_house_call: v }))} /> House Call
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={form.is_free_intro} onCheckedChange={v => setForm(p => ({ ...p, is_free_intro: v }))} /> Free Intro
            </label>
          </div>
          <Button className="w-full" size="sm" onClick={handleSubmit} disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
            {editingId ? 'Update' : 'Add Service'}
          </Button>
        </Card>
      )}
    </div>
  );
}
