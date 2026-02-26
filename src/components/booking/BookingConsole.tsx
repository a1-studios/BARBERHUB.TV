import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SubscriptionBadge } from '@/components/SubscriptionBadge';
import { ServiceSelector } from './ServiceSelector';
import { DateSlotPicker } from './DateSlotPicker';
import { BountyPresetPicker } from './BountyPresetPicker';
import { EscrowConfirmDialog } from './EscrowConfirmDialog';
import { useBarberAvailability } from '@/hooks/useBarberAvailability';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { useBookAppointment } from '@/hooks/useBookAppointment';
import { cn } from '@/lib/utils';
import { Calendar, Zap, Home, Lock } from 'lucide-react';

type BookingType = 'standard' | 'sos' | 'house_call';

interface BookingConsoleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberId: string;
  barberUserId: string;
  barberName: string;
  barberAvatar?: string;
  barberTier?: string | null;
}

export function BookingConsole({
  open,
  onOpenChange,
  barberId,
  barberUserId,
  barberName,
  barberAvatar,
  barberTier,
}: BookingConsoleProps) {
  const [bookingType, setBookingType] = useState<BookingType>('standard');
  const [selectedService, setSelectedService] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bountyAmount, setBountyAmount] = useState(750);
  const [locationText, setLocationText] = useState('');
  const [notes, setNotes] = useState('');
  const [showEscrow, setShowEscrow] = useState(false);

  const { services, getAvailableSlots, isLoading } = useBarberAvailability(barberId);
  const { barberBucks } = useBarberBucks();
  const { bookMutation } = useBookAppointment();

  const canAcceptPremium = barberTier && barberTier !== 'bronze';
  const isPremiumLocked = !canAcceptPremium && bookingType !== 'standard';

  // Calculate price
  const getPrice = () => {
    if (bookingType === 'house_call') return Math.max(bountyAmount, 500);
    if (bookingType === 'sos') {
      const service = services.find(s => s.id === selectedService);
      return Math.max((service?.price_bb || 250) * 2, 500);
    }
    const service = services.find(s => s.id === selectedService);
    return service?.price_bb || 0;
  };

  const getServiceName = () => {
    const service = services.find(s => s.id === selectedService);
    return service?.service_name || (bookingType === 'house_call' ? 'House Call' : 'Emergency Cut');
  };

  const getScheduledAt = () => {
    if (bookingType === 'sos') {
      // Next available = now + 1 hour
      return new Date(Date.now() + 60 * 60000).toISOString();
    }
    return selectedSlot || new Date().toISOString();
  };

  const handleBook = () => {
    if (isPremiumLocked) return;
    const price = getPrice();
    if (price <= 0) return;
    if (bookingType === 'standard' && !selectedSlot) return;
    setShowEscrow(true);
  };

  const handleConfirmEscrow = () => {
    bookMutation.mutate(
      {
        barber_id: barberId,
        barber_user_id: barberUserId,
        service_id: selectedService || undefined,
        appointment_type: bookingType,
        scheduled_at: getScheduledAt(),
        duration_minutes: services.find(s => s.id === selectedService)?.duration_minutes || 30,
        escrow_amount_bb: getPrice(),
        client_location_text: bookingType === 'house_call' ? locationText : undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setShowEscrow(false);
          onOpenChange(false);
          // Reset
          setSelectedService('');
          setSelectedSlot(null);
          setBountyAmount(750);
          setLocationText('');
          setNotes('');
        },
      }
    );
  };

  const tabs: { type: BookingType; label: string; icon: React.ReactNode; color: string }[] = [
    { type: 'standard', label: 'Standard', icon: <Calendar className="h-4 w-4" />, color: 'bg-primary' },
    { type: 'sos', label: 'Emergency', icon: <Zap className="h-4 w-4" />, color: 'bg-destructive' },
    { type: 'house_call', label: 'House Call', icon: <Home className="h-4 w-4" />, color: 'bg-amber-500' },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-primary/30 p-0">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-primary/30">
                <AvatarImage src={barberAvatar} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {barberName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{barberName}</h3>
                  {barberTier && <SubscriptionBadge tier={barberTier} size="sm" />}
                </div>
                <p className="text-sm text-muted-foreground">
                  Your Balance: <span className="text-primary font-bold">{barberBucks.toLocaleString()} BB</span>
                </p>
              </div>
            </div>
          </div>

          {/* Tri-State Toggle */}
          <div className="px-6 pt-4">
            <div className="grid grid-cols-3 gap-2">
              {tabs.map(({ type, label, icon, color }) => (
                <Button
                  key={type}
                  type="button"
                  variant={bookingType === type ? 'default' : 'outline'}
                  className={cn(
                    'relative flex items-center gap-1.5 h-11 text-xs font-bold',
                    bookingType === type && type === 'standard' && 'bg-primary text-primary-foreground',
                    bookingType === type && type === 'sos' && 'bg-destructive text-destructive-foreground animate-pulse',
                    bookingType === type && type === 'house_call' && 'bg-amber-500 text-black',
                    bookingType !== type && 'border-muted-foreground/30'
                  )}
                  onClick={() => setBookingType(type)}
                >
                  {icon}
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-4">
            {/* Tier Lock Message */}
            {isPremiumLocked && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-muted-foreground/20">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  This barber needs Silver+ to accept {bookingType === 'sos' ? 'Emergency SOS' : 'House Call'} bookings
                </span>
              </div>
            )}

            {/* Standard Mode */}
            {bookingType === 'standard' && (
              <>
                <ServiceSelector
                  services={services}
                  value={selectedService}
                  onChange={setSelectedService}
                  filterType="standard"
                />
                {isLoading ? (
                  <div className="animate-pulse h-32 bg-muted rounded-lg" />
                ) : (
                  <DateSlotPicker
                    getAvailableSlots={getAvailableSlots}
                    selectedSlot={selectedSlot}
                    onSelectSlot={setSelectedSlot}
                  />
                )}
              </>
            )}

            {/* SOS Mode */}
            {bookingType === 'sos' && !isPremiumLocked && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border-2 border-destructive/30 bg-destructive/5 text-center space-y-2">
                  <Zap className="h-8 w-8 text-destructive mx-auto animate-pulse" />
                  <p className="text-sm font-bold">EMERGENCY CUT</p>
                  <p className="text-xs text-muted-foreground">Next available slot · 2.0x surge pricing</p>
                  <p className="text-2xl font-black text-destructive">{getPrice().toLocaleString()} BB</p>
                  <p className="text-[10px] text-muted-foreground">Min 500 BB</p>
                </div>
                <ServiceSelector
                  services={services}
                  value={selectedService}
                  onChange={setSelectedService}
                  filterType="sos"
                />
              </div>
            )}

            {/* House Call Mode */}
            {bookingType === 'house_call' && !isPremiumLocked && (
              <div className="space-y-4">
                <BountyPresetPicker
                  value={bountyAmount}
                  onChange={setBountyAmount}
                  minAmount={500}
                />
                <ServiceSelector
                  services={services}
                  value={selectedService}
                  onChange={setSelectedService}
                  filterType="house_call"
                />
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Your Location</Label>
                  <Input
                    placeholder="Enter your address..."
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    className="border-amber-500/30 focus:border-amber-500"
                  />
                </div>
                <DateSlotPicker
                  getAvailableSlots={getAvailableSlots}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Notes (optional)</Label>
              <Input
                placeholder="Any special requests..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border-primary/20"
              />
            </div>

            {/* Total & CTA */}
            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total</span>
                <span className="text-xl font-black text-primary">{getPrice().toLocaleString()} BB</span>
              </div>
              <Button
                className="w-full h-12 font-black text-base bg-primary hover:bg-primary/90"
                disabled={
                  isPremiumLocked ||
                  getPrice() <= 0 ||
                  (bookingType === 'standard' && !selectedSlot) ||
                  (bookingType === 'house_call' && bountyAmount < 500) ||
                  bookMutation.isPending
                }
                onClick={handleBook}
              >
                COMMIT TO ESCROW
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                5% platform fee · Refundable if cancelled 2+ hrs before
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EscrowConfirmDialog
        open={showEscrow}
        onOpenChange={setShowEscrow}
        onConfirm={handleConfirmEscrow}
        loading={bookMutation.isPending}
        appointmentType={bookingType}
        serviceName={getServiceName()}
        amount={getPrice()}
        currentBalance={barberBucks}
        scheduledAt={getScheduledAt()}
      />
    </>
  );
}
