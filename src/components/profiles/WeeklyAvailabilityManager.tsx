import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DayRow {
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

const defaultRows: DayRow[] = DAYS.map((_, i) => ({
  day_of_week: i,
  is_available: i >= 1 && i <= 5, // Mon-Fri default on
  start_time: '09:00',
  end_time: '18:00',
}));

export function WeeklyAvailabilityManager({ barberId }: { barberId: string | undefined }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<DayRow[]>(defaultRows);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['barber-availability-full', barberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_availability')
        .select('*')
        .eq('barber_id', barberId!)
        .order('day_of_week');
      if (error) throw error;
      return data;
    },
    enabled: !!barberId,
  });

  useEffect(() => {
    if (existing && existing.length > 0) {
      const merged = defaultRows.map(def => {
        const found = existing.find(e => e.day_of_week === def.day_of_week);
        if (found) return {
          day_of_week: found.day_of_week,
          is_available: found.is_available,
          start_time: found.start_time.slice(0, 5),
          end_time: found.end_time.slice(0, 5),
        };
        return def;
      });
      setRows(merged);
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!barberId || !user?.id) throw new Error('Missing IDs');
      // Delete existing then insert fresh
      await supabase.from('barber_availability').delete().eq('barber_id', barberId);
      const inserts = rows.map(r => ({
        barber_id: barberId,
        barber_user_id: user.id,
        day_of_week: r.day_of_week,
        is_available: r.is_available,
        start_time: r.start_time,
        end_time: r.end_time,
      }));
      const { error } = await supabase.from('barber_availability').insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-availability-full', barberId] });
      queryClient.invalidateQueries({ queryKey: ['barber-availability'] });
      toast.success('Availability saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRow = (i: number, patch: Partial<DayRow>) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };

  if (isLoading) return <div className="animate-pulse h-20 bg-muted rounded-lg" />;

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm">Weekly Schedule</h4>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.day_of_week} className="flex items-center gap-2 sm:gap-3">
            <div className="w-16 sm:w-20 shrink-0">
              <Label className="text-xs font-medium">{DAYS[row.day_of_week].slice(0, 3)}</Label>
            </div>
            <Switch
              checked={row.is_available}
              onCheckedChange={v => updateRow(i, { is_available: v })}
            />
            {row.is_available ? (
              <>
                <Input
                  type="time"
                  value={row.start_time}
                  onChange={e => updateRow(i, { start_time: e.target.value })}
                  className="w-[110px] h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={row.end_time}
                  onChange={e => updateRow(i, { end_time: e.target.value })}
                  className="w-[110px] h-8 text-xs"
                />
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic">Closed</span>
            )}
          </div>
        ))}
      </div>
      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm" className="w-full">
        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
        Save Schedule
      </Button>
    </div>
  );
}
