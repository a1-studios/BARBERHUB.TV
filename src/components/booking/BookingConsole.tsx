import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TierRing } from '@/components/TierRing';
import { ServiceSelector } from './ServiceSelector';
import { DateSlotPicker } from './DateSlotPicker';
import { BountyPresetPicker } from './BountyPresetPicker';
import { EscrowConfirmDialog } from './EscrowConfirmDialog';
import { StyleCaptureButton } from './StyleCaptureButton';
import { useBarberAvailability } from '@/hooks/useBarberAvailability';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { useBookAppointment } from '@/hooks/useBookAppointment';
import { cn } from '@/lib/utils';
import { Zap, Home, Gift, Pencil } from 'lucide-react';

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
  
  const [showNotes, setShowNotes] = useState(false);

  const { services, getAvailableSlots, isLoading } = useBarberAvailability(barberId);
  const { barberBucks } = useBarberBucks();
  const { bookMutation } = useBookAppointment();

  const selectedSvc = services.find(s => s.id === selectedService);

  const getPrice = () => {
    if (bookingType === 'house_call') return Math.max(bountyAmount, 500);
    if (bookingType === 'sos') return Math.max((selectedSvc?.price_bb || 250) * 2, 500);
    if (selectedSvc?.is_free_intro) return 0;
    return selectedSvc?.price_bb || 0;
  };

  const getDepositAmount = () => {
    if (bookingType !== 'standard' || !selectedSvc) return getPrice();
    if (selectedSvc.is_free_intro) return 0;
    if (selectedSvc.deposit_bb > 0 && selectedSvc.deposit_bb < selectedSvc.price_bb) return selectedSvc.deposit_bb;
    return getPrice();
  };

  const getRemainder = () => getPrice() - getDepositAmount();
  const isDepositOnly = getRemainder() > 0;
  const isFreeBooking = selectedSvc?.is_free_intro && bookingType === 'standard';

  const getServiceName = () => selectedSvc?.service_name || (bookingType === 'house_call' ? 'House Call' : 'Emergency Cut');

  const getScheduledAt = () => {
    if (bookingType === 'sos') return new Date(Date.now() + 60 * 60000).toISOString();
    return selectedSlot || new Date().toISOString();
  };

  const handleBook = () => {
    if (bookingType === 'standard' && !selectedSlot && !isFreeBooking) return;
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
        duration_minutes: selectedSvc?.duration_minutes || 30,
        escrow_amount_bb: getDepositAmount(),
        client_location_text: bookingType === 'house_call' ? locationText : undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setShowEscrow(false);
          onOpenChange(false);
          setSelectedService('');
          setSelectedSlot(null);
          setBountyAmount(750);
          setLocationText('');
          setNotes('');
        },
      }
    );
  };

  const handleStyleAnalysis = (brief: string) => {
    setNotes(brief);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden border-primary/30 p-0">
          {/* Barber Header */}
          <div className="p-4 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <TierRing tier={barberTier} size="sm">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={barberAvatar} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {barberName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TierRing>
              <div className="flex-1">
                <h3 className="font-bold text-base">{barberName}</h3>
                <p className="text-xs text-muted-foreground">Book your cut</p>
              </div>
            </div>
          </div>

          <div className="px-4 pb-3 space-y-4">
            {/* Style Capture Portal — Hero Section */}
            <StyleCaptureButton onAnalysisComplete={handleStyleAnalysis} />

            {/* Service Selector */}
            {bookingType === 'standard' && (
              <>
                <ServiceSelector
                  services={services}
                  value={selectedService}
                  onChange={setSelectedService}
                  filterType="standard"
                />
                {isFreeBooking && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <Gift className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-400 font-bold">FREE First Cut!</span>
                  </div>
                )}
              </>
            )}

            {bookingType === 'sos' && (
              <div className="space-y-3">
                <div className="p-4 rounded-lg border-2 border-destructive/30 bg-destructive/5 text-center space-y-2">
                  <Zap className="h-8 w-8 text-destructive mx-auto animate-pulse" />
                  <p className="text-sm font-bold">EMERGENCY CUT</p>
                  <p className="text-xs text-muted-foreground">Next slot · 2x surge</p>
                  <p className="text-2xl font-black text-destructive">{getPrice().toLocaleString()} BB</p>
                </div>
                <ServiceSelector services={services} value={selectedService} onChange={setSelectedService} filterType="sos" />
              </div>
            )}

            {bookingType === 'house_call' && (
              <div className="space-y-3">
                <BountyPresetPicker value={bountyAmount} onChange={setBountyAmount} minAmount={500} />
                <ServiceSelector services={services} value={selectedService} onChange={setSelectedService} filterType="house_call" />
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Your Location</Label>
                  <Input
                    placeholder="Enter your address..."
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    className="border-accent/30 focus:border-accent"
                  />
                </div>
              </div>
            )}

            {/* Time Slots */}
            {bookingType !== 'sos' && (
              isLoading ? (
                <div className="animate-pulse h-24 bg-muted rounded-lg" />
              ) : (
                <DateSlotPicker
                  getAvailableSlots={getAvailableSlots}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                />
              )
            )}

            {/* Notes — collapsible */}
            {!showNotes ? (
              <button
                onClick={() => setShowNotes(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3 w-3" />
                {notes ? 'Edit notes' : 'Add a note'}
              </button>
            ) : (
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Notes</Label>
                <Input
                  placeholder="Any special requests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border-primary/20 text-xs"
                />
              </div>
            )}

            {/* Total & CTA */}
            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {isFreeBooking ? 'Total' : isDepositOnly ? 'Deposit Now' : 'Total'}
                </span>
                <span className="text-lg font-black text-primary">
                  {isFreeBooking ? <span className="text-green-400">FREE</span> : `${getDepositAmount().toLocaleString()} BB`}
                </span>
              </div>
              {isDepositOnly && (
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Due on arrival</span>
                  <span>{getRemainder().toLocaleString()} BB</span>
                </div>
              )}
              <Button
                className="w-full h-10 font-black text-sm bg-primary hover:bg-primary/90"
                disabled={
                  (!isFreeBooking && getDepositAmount() <= 0 && !isFreeBooking) ||
                  (bookingType === 'standard' && !selectedSlot) ||
                  (bookingType === 'house_call' && bountyAmount < 500) ||
                  bookMutation.isPending
                }
                onClick={handleBook}
              >
                {isFreeBooking ? 'BOOK FREE CUT' : 'BOOK NOW'}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                5% platform fee · Refundable if cancelled 2+ hrs before
              </p>
            </div>

            {/* SOS / House Call — always visible */}
            {bookingType === 'standard' && (
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-[11px] font-bold border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => setBookingType('sos')}
                >
                  <Zap className="h-3.5 w-3.5 mr-1" /> SOS Cut
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-[11px] font-bold border-accent/30 text-accent-foreground hover:bg-accent/10"
                  onClick={() => setBookingType('house_call')}
                >
                  <Home className="h-3.5 w-3.5 mr-1" /> House Call
                </Button>
              </div>
            )}

            {bookingType !== 'standard' && (
              <button
                onClick={() => setBookingType('standard')}
                className="w-full text-[11px] text-muted-foreground hover:text-foreground text-center pt-1"
              >
                ← Back to standard booking
              </button>
            )}
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
        amount={getDepositAmount()}
        currentBalance={barberBucks}
        scheduledAt={getScheduledAt()}
        isDepositOnly={isDepositOnly}
        remainderBb={getRemainder()}
        isFree={!!isFreeBooking}
      />
    </>
  );
}
