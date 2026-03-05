import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BountyPresetPicker } from './BountyPresetPicker';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Home, MapPin, Wallet } from 'lucide-react';

export function HouseCallBountyWidget() {
  const [locationText, setLocationText] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [bountyAmount, setBountyAmount] = useState(750);
  const { barberBucks } = useBarberBucks();
  const queryClient = useQueryClient();

  const postBounty = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('post-bounty', {
        body: {
          location_text: locationText,
          service_description: serviceDescription || undefined,
          bounty_amount_bb: bountyAmount,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
      queryClient.invalidateQueries({ queryKey: ['my-bounties'] });
      toast.success('Bounty posted! Barbers can now claim it.');
      setLocationText('');
      setServiceDescription('');
      setBountyAmount(750);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to post bounty'),
  });

  const canPost = locationText.trim().length > 0 && bountyAmount >= 500 && barberBucks >= bountyAmount;

  return (
    <Card className="border-accent/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Home className="h-4 w-4 text-accent" />
          Post House Call Bounty
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">Your Wallet</span>
          </div>
          <span className="text-xs font-black text-primary">{barberBucks.toLocaleString()} BB</span>
        </div>

        <div className="space-y-1">
          <Label className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Your Location
          </Label>
          <Input
            placeholder="e.g. Miami Beach, FL"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            className="border-accent/30 focus:border-accent"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-sm text-muted-foreground">What do you need?</Label>
          <Textarea
            placeholder="e.g. Fade + beard trim"
            value={serviceDescription}
            onChange={(e) => setServiceDescription(e.target.value)}
            className="border-accent/30 focus:border-accent min-h-[60px]"
            rows={2}
          />
        </div>

        <BountyPresetPicker value={bountyAmount} onChange={setBountyAmount} minAmount={500} />

        <Button
          className="w-full h-10 font-black text-sm bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={!canPost || postBounty.isPending}
          onClick={() => postBounty.mutate()}
        >
          {postBounty.isPending ? 'Posting...' : `POST BOUNTY · ${bountyAmount.toLocaleString()} BB`}
        </Button>
        <p className="text-[10px] text-center text-muted-foreground">
          BB held in escrow · Expires in 24hrs · Auto-refund if unclaimed
        </p>
      </CardContent>
    </Card>
  );
}
