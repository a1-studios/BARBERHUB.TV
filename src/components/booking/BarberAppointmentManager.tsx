import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useBookAppointment } from '@/hooks/useBookAppointment';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { toast } from 'sonner';
import { Plus, Trash2, Calendar, Clock, Zap, Home, Check, X } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function BarberAppointmentManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { manageMutation } = useBookAppointment();
  const [showAddService, setShowAddService] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [newService, setNewService] = useState({ service_name: '', price_bb: 100, duration_minutes: 30, allows_house_call: false, allows_sos: false });

  // Get barber profile
  const { data: barberProfile } = useQuery({
    queryKey: ['my-barber-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('id, active_subscription_tier')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Services
  const { data: services, refetch: refetchServices } = useQuery({
    queryKey: ['my-services', barberProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_services')
        .select('*')
        .eq('barber_id', barberProfile!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!barberProfile,
  });

  // Availability
  const { data: availability, refetch: refetchAvailability } = useQuery({
    queryKey: ['my-availability', barberProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_availability')
        .select('*')
        .eq('barber_id', barberProfile!.id)
        .order('day_of_week', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!barberProfile,
  });

  // Appointments
  const { data: appointments, refetch: refetchAppointments } = useQuery({
    queryKey: ['my-appointments', barberProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('barber_id', barberProfile!.id)
        .in('status', ['pending', 'confirmed', 'escrow_locked', 'in_transit'])
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!barberProfile,
  });

  // Add service
  const addServiceMutation = useMutation({
    mutationFn: async () => {
      if (!barberProfile || !user) throw new Error('Not ready');
      const { error } = await supabase.from('barber_services').insert({
        barber_id: barberProfile.id,
        barber_user_id: user.id,
        ...newService,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchServices();
      setShowAddService(false);
      setNewService({ service_name: '', price_bb: 100, duration_minutes: 30, allows_house_call: false, allows_sos: false });
      toast.success('Service added!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete service
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('barber_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { refetchServices(); toast.success('Service removed'); },
  });

  // Save availability for a day
  const saveAvailability = useMutation({
    mutationFn: async (params: { day: number; start: string; end: string; available: boolean }) => {
      if (!barberProfile || !user) throw new Error('Not ready');
      const { error } = await supabase
        .from('barber_availability')
        .upsert({
          barber_id: barberProfile.id,
          barber_user_id: user.id,
          day_of_week: params.day,
          start_time: params.start,
          end_time: params.end,
          is_available: params.available,
        }, { onConflict: 'barber_id,day_of_week' });
      if (error) throw error;
    },
    onSuccess: () => { refetchAvailability(); toast.success('Schedule updated'); },
  });

  const canAcceptPremium = barberProfile?.active_subscription_tier && barberProfile.active_subscription_tier !== 'bronze';

  const handleDeny = (id: string) => {
    manageMutation.mutate({ appointment_id: id, action: 'deny', denial_reason: denyReason }, {
      onSuccess: () => { setShowDenyDialog(null); setDenyReason(''); refetchAppointments(); },
    });
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
    in_transit: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  const typeIcons: Record<string, React.ReactNode> = {
    standard: <Calendar className="h-4 w-4" />,
    sos: <Zap className="h-4 w-4 text-destructive" />,
    house_call: <Home className="h-4 w-4 text-amber-400" />,
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="appointments">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appointments">
            Appointments {appointments?.length ? `(${appointments.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        {/* ---- APPOINTMENTS ---- */}
        <TabsContent value="appointments" className="space-y-4">
          {(!appointments || appointments.length === 0) ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No upcoming appointments</CardContent></Card>
          ) : (
            appointments.map((appt) => (
              <Card key={appt.id} className={appt.appointment_type === 'sos' ? 'border-destructive/30 animate-pulse' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {typeIcons[appt.appointment_type]}
                      <div>
                        <p className="font-semibold text-sm capitalize">{appt.appointment_type.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(appt.scheduled_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                        {appt.client_location_text && (
                          <p className="text-xs text-amber-400 mt-1">📍 {appt.client_location_text}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge className={statusColors[appt.status] || ''}>{appt.status}</Badge>
                      <p className="text-lg font-black text-primary">{appt.escrow_amount_bb} BB</p>
                    </div>
                  </div>

                  {/* Actions */}
                  {appt.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      {appt.appointment_type !== 'standard' && !canAcceptPremium ? (
                        <Button variant="outline" size="sm" className="flex-1 text-muted-foreground" disabled>
                          Upgrade to Silver+ to accept
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => manageMutation.mutate({ appointment_id: appt.id, action: 'accept' }, { onSuccess: () => refetchAppointments() })}
                            disabled={manageMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => setShowDenyDialog(appt.id)}
                            disabled={manageMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" /> Deny
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {(appt.status === 'confirmed' || appt.status === 'in_transit') && (
                    <Button
                      size="sm"
                      className="w-full mt-4 bg-primary"
                      onClick={() => manageMutation.mutate({ appointment_id: appt.id, action: 'complete' }, { onSuccess: () => refetchAppointments() })}
                      disabled={manageMutation.isPending}
                    >
                      Mark Complete ✂️
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ---- SERVICES ---- */}
        <TabsContent value="services" className="space-y-4">
          <Button size="sm" onClick={() => setShowAddService(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Service
          </Button>
          {services?.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{s.service_name}</p>
                  <p className="text-sm text-muted-foreground">{s.price_bb} BB · {s.duration_minutes}min</p>
                  <div className="flex gap-1 mt-1">
                    {s.allows_house_call && <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">House Call</Badge>}
                    {s.allows_sos && <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">SOS</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteServiceMutation.mutate(s.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ---- SCHEDULE ---- */}
        <TabsContent value="schedule" className="space-y-3">
          {DAYS.map((day, i) => {
            const dayAvail = availability?.find(a => a.day_of_week === i);
            return (
              <Card key={i}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Switch
                    checked={dayAvail?.is_available ?? false}
                    onCheckedChange={(checked) =>
                      saveAvailability.mutate({
                        day: i,
                        start: dayAvail?.start_time || '09:00',
                        end: dayAvail?.end_time || '17:00',
                        available: checked,
                      })
                    }
                  />
                  <span className="font-medium w-24 text-sm">{day}</span>
                  {(dayAvail?.is_available) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Input
                        type="time"
                        className="w-28 h-8 text-xs"
                        defaultValue={dayAvail?.start_time || '09:00'}
                        onBlur={(e) =>
                          saveAvailability.mutate({
                            day: i,
                            start: e.target.value,
                            end: dayAvail?.end_time || '17:00',
                            available: true,
                          })
                        }
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        className="w-28 h-8 text-xs"
                        defaultValue={dayAvail?.end_time || '17:00'}
                        onBlur={(e) =>
                          saveAvailability.mutate({
                            day: i,
                            start: dayAvail?.start_time || '09:00',
                            end: e.target.value,
                            available: true,
                          })
                        }
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Add Service Dialog */}
      <Dialog open={showAddService} onOpenChange={setShowAddService}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Service</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Service Name</Label><Input value={newService.service_name} onChange={e => setNewService(p => ({ ...p, service_name: e.target.value }))} placeholder="e.g. Fade Cut" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Price (BB)</Label><Input type="number" value={newService.price_bb} onChange={e => setNewService(p => ({ ...p, price_bb: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={newService.duration_minutes} onChange={e => setNewService(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 30 }))} /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={newService.allows_house_call} onCheckedChange={v => setNewService(p => ({ ...p, allows_house_call: v }))} /><Label className="text-sm">House Call</Label></div>
              <div className="flex items-center gap-2"><Switch checked={newService.allows_sos} onCheckedChange={v => setNewService(p => ({ ...p, allows_sos: v }))} /><Label className="text-sm">SOS</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addServiceMutation.mutate()} disabled={!newService.service_name || addServiceMutation.isPending}>Add Service</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={!!showDenyDialog} onOpenChange={() => setShowDenyDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deny Appointment</DialogTitle></DialogHeader>
          <div><Label>Reason</Label><Textarea value={denyReason} onChange={e => setDenyReason(e.target.value)} placeholder="Why are you declining?" /></div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => showDenyDialog && handleDeny(showDenyDialog)} disabled={manageMutation.isPending}>
              Deny & Refund Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
