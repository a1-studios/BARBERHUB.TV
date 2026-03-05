import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Service {
  id: string;
  service_name: string;
  price_bb: number;
  duration_minutes: number;
  allows_house_call: boolean;
  allows_sos: boolean;
  deposit_bb?: number;
  is_free_intro?: boolean;
}

interface ServiceSelectorProps {
  services: Service[];
  value: string;
  onChange: (serviceId: string) => void;
  filterType?: 'standard' | 'house_call' | 'sos';
}

export function ServiceSelector({ services, value, onChange, filterType }: ServiceSelectorProps) {
  const filtered = filterType
    ? services.filter(s => {
        if (filterType === 'house_call') return s.allows_house_call;
        if (filterType === 'sos') return s.allows_sos;
        return true;
      })
    : services;

  if (filtered.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No services available for this booking type
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-sm text-muted-foreground">Service</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="border-primary/30">
          <SelectValue placeholder="Select a service" />
        </SelectTrigger>
        <SelectContent>
          {filtered.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <span className="flex items-center justify-between w-full gap-4">
                <span className="flex items-center gap-2">
                  {s.service_name}
                  {s.is_free_intro && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px] px-1 py-0">
                      FREE
                    </Badge>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.is_free_intro ? 'Free' : `${s.price_bb} BB`}
                  {!s.is_free_intro && s.deposit_bb && s.deposit_bb > 0 && s.deposit_bb < s.price_bb && (
                    <span className="text-primary"> ({s.deposit_bb} BB deposit)</span>
                  )}
                  {' · '}{s.duration_minutes}min
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
