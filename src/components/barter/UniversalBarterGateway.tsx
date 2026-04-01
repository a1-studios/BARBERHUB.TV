import { useState, useMemo, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DateSlotPicker } from '@/components/booking/DateSlotPicker';
import { useBarberAvailability } from '@/hooks/useBarberAvailability';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  HandCoins, Clock, Sun, Moon, Loader2, CheckCircle2, Lock, Trash2, X,
} from 'lucide-react';

export interface UniversalBarterGatewayProps {
  perkCategory: 'subscription' | 'battle_entry' | 'visibility_boost';
  perkDetails: Record<string, any>;
  requiredBBValue: number;
  onSuccess: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

interface DonatedSlot {
  service_id: string;
  service_name: string;
  slot_datetime: string;
  time_tier: 'prime_time' | 'off_peak';
  service_type: string;
  bb_value: number;
}

function getTimeTier(iso: string): 'prime_time' | 'off_peak' {
  const d = new Date(iso);
  const day = d.getDay();
  const hour = d.getHours();
  // Weekends or weekday evenings (5PM+) = prime_time
  if (day === 0 || day === 6 || hour >= 17) return 'prime_time';
  return 'off_peak';
}

function inferServiceType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('kid')) return 'kids_cut';
  if (lower.includes('beard') && lower.includes('cut')) return 'full_cut_beard';
  if (lower.includes('beard') || lower.includes('trim')) return 'beard_trim';
  if (lower.includes('shape') || lower.includes('line')) return 'shape_up';
  return 'haircut';
}

const PERK_LABELS: Record<string, string> = {
  subscription: 'Subscription',
  battle_entry: 'Battle Entry',
  visibility_boost: 'Visibility Boost',
};

export function UniversalBarterGateway({
  perkCategory,
  perkDetails,
  requiredBBValue,
  onSuccess,
  onCancel,
  isOpen,
}: UniversalBarterGatewayProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [donatedSlots, setDonatedSlots] = useState<DonatedSlot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Get barber profile id
  const { data: barberProfile } = useQuery({
    queryKey: ['barber-profile-for-barter', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('id')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && isOpen,
  });

  const { services, getAvailableSlots, isLoading } = useBarberAvailability(barberProfile?.id);

  const totalDonatedBB = useMemo(
    () => donatedSlots.reduce((sum, s) => sum + s.bb_value, 0),
    [donatedSlots]
  );

  const progressPercent = Math.min((totalDonatedBB / requiredBBValue) * 100, 100);
  const thresholdMet = totalDonatedBB >= requiredBBValue;

  const selectedService = useMemo(
    () => services.find((s: any) => s.id === selectedServiceId),
    [services, selectedServiceId]
  );

  const handleSlotSelect = useCallback(
    (slotIso: string) => {
      if (!selectedService) return;
      setSelectedSlot(slotIso);

      // Check if already donated
      if (donatedSlots.some((d) => d.slot_datetime === slotIso && d.service_id === selectedService.id)) {
        toast.info('This slot is already in your cart');
        return;
      }

      const tier = getTimeTier(slotIso);
      const multiplier = tier === 'prime_time' ? 1.0 : 0.75;
      const bbVal = Math.round(selectedService.price_bb * multiplier);

      setDonatedSlots((prev) => [
        ...prev,
        {
          service_id: selectedService.id,
          service_name: selectedService.service_name,
          slot_datetime: slotIso,
          time_tier: tier,
          service_type: inferServiceType(selectedService.service_name),
          bb_value: bbVal,
        },
      ]);
    },
    [selectedService, donatedSlots]
  );

  const removeSlot = (index: number) => {
    setDonatedSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user || !thresholdMet) return;
    setSubmitting(true);

    try {
      const payload = donatedSlots.map((s) => ({
        service_id: s.service_id,
        slot_datetime: s.slot_datetime,
        time_tier: s.time_tier,
        service_type: s.service_type,
      }));

      const { data, error } = await supabase.rpc('process_universal_barter_checkout', {
        p_barber_id: user.id,
        p_perk_category: perkCategory,
        p_perk_details: perkDetails,
        p_required_bb_value: requiredBBValue,
        p_donated_slots: payload,
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result.success) throw new Error('Barter checkout failed');

      setCompleted(true);
      toast.success(`${PERK_LABELS[perkCategory]} unlocked via service barter!`);

      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
      queryClient.invalidateQueries({ queryKey: ['barber-availability'] });
      queryClient.invalidateQueries({ queryKey: ['barber-existing-appointments'] });

      setTimeout(() => {
        onSuccess();
        setCompleted(false);
        setDonatedSlots([]);
        setSelectedServiceId(null);
      }, 1500);
    } catch (err: any) {
      console.error('Barter error:', err);
      toast.error(err.message || 'Barter checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setDonatedSlots([]);
      setSelectedServiceId(null);
      setCompleted(false);
      onCancel();
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-center pb-2">
          <DrawerTitle className="flex items-center justify-center gap-2 text-lg font-bold">
            <HandCoins className="w-5 h-5 text-primary" />
            Pay with Services
          </DrawerTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Donate time slots to unlock {PERK_LABELS[perkCategory]}
          </p>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto space-y-4">
          {completed ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircle2 className="w-16 h-16 text-green-500 animate-pulse" />
              <p className="text-lg font-bold text-foreground">Slots Locked!</p>
              <p className="text-sm text-muted-foreground text-center">
                Your {donatedSlots.length} donated slot{donatedSlots.length !== 1 ? 's' : ''} are now
                locked and {PERK_LABELS[perkCategory]} is active.
              </p>
            </div>
          ) : (
            <>
              {/* Cost banner */}
              <div className="flex items-center justify-between py-2 px-3 bg-primary/10 rounded-lg border border-primary/20">
                <span className="text-sm font-medium">Required Value</span>
                <span className="text-sm font-bold text-primary">{requiredBBValue} BB</span>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Donated: {totalDonatedBB} BB</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-3" />
              </div>

              {/* Step 1: Service Picker */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">1. Select a Service</p>
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : services.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No active services found. Add services in your barber profile first.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {services.map((svc: any) => {
                      const isSelected = selectedServiceId === svc.id;
                      return (
                        <Card
                          key={svc.id}
                          className={`p-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 ring-1 ring-primary'
                              : 'border-border/30 hover:border-primary/40'
                          }`}
                          onClick={() => {
                            setSelectedServiceId(svc.id);
                            setSelectedSlot(null);
                          }}
                        >
                          <p className="text-sm font-semibold truncate">{svc.service_name}</p>
                          <p className="text-xs text-primary font-bold">{svc.price_bb} BB</p>
                          <p className="text-[10px] text-muted-foreground">{svc.duration_minutes}min</p>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 2: Date/Slot Picker */}
              {selectedServiceId && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">2. Pick Time Slots to Donate</p>
                  <DateSlotPicker
                    getAvailableSlots={getAvailableSlots}
                    selectedSlot={selectedSlot}
                    onSelectSlot={handleSlotSelect}
                  />
                </div>
              )}

              {/* Donation Cart */}
              {donatedSlots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    Donated Slots ({donatedSlots.length})
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {donatedSlots.map((slot, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 px-3 bg-card/60 border border-border/20 rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{slot.service_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(slot.slot_datetime).toLocaleDateString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric',
                              })}{' '}
                              {new Date(slot.slot_datetime).toLocaleTimeString('en-US', {
                                hour: 'numeric', minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant="outline"
                            className={
                              slot.time_tier === 'prime_time'
                                ? 'border-yellow-500/40 text-yellow-400 text-[9px]'
                                : 'border-blue-500/40 text-blue-400 text-[9px]'
                            }
                          >
                            {slot.time_tier === 'prime_time' ? (
                              <><Sun className="w-2.5 h-2.5 mr-0.5" /> Prime</>
                            ) : (
                              <><Moon className="w-2.5 h-2.5 mr-0.5" /> Off-Peak</>
                            )}
                          </Badge>
                          <span className="text-xs font-bold text-primary">{slot.bb_value} BB</span>
                          <button onClick={() => removeSlot(i)} className="text-muted-foreground hover:text-destructive">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={!thresholdMet || submitting}
                className="w-full h-12 font-bold rounded-xl text-base"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : thresholdMet ? (
                  <><Lock className="w-4 h-4 mr-2" /> Lock Slots & Unlock {PERK_LABELS[perkCategory]}</>
                ) : (
                  `Add ${requiredBBValue - totalDonatedBB} more BB in slots`
                )}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                Donated slots are locked for the month and cannot be edited or canceled.
                Prime-time slots (evenings & weekends) count at full value; off-peak at 75%.
              </p>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
