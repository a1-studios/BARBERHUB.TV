import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { CHAIR_AMENITIES, type ChairFilters, type ChairAmenityId } from '../types';

interface Props {
  filters: ChairFilters;
  onChange: (next: ChairFilters) => void;
}

export function ChairFilterSidebar({ filters, onChange }: Props) {
  const toggleAmenity = (id: ChairAmenityId) => {
    const has = filters.amenities.includes(id);
    onChange({
      ...filters,
      amenities: has ? filters.amenities.filter((a) => a !== id) : [...filters.amenities, id],
    });
  };

  return (
    <div className="space-y-5 p-4 rounded-xl bg-card/40 backdrop-blur-sm border border-border/40">
      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Dates</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[11px] text-muted-foreground">From</Label>
            <Input
              type="date"
              value={filters.startDate ?? ''}
              onChange={(e) => onChange({ ...filters, startDate: e.target.value || null })}
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">To</Label>
            <Input
              type="date"
              value={filters.endDate ?? ''}
              onChange={(e) => onChange({ ...filters, endDate: e.target.value || null })}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Radius: {filters.radiusMiles} mi
        </h3>
        <Slider
          value={[filters.radiusMiles]}
          min={5}
          max={100}
          step={5}
          onValueChange={(v) => onChange({ ...filters, radiusMiles: v[0] })}
        />
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Amenities</h3>
        <div className="grid grid-cols-2 gap-2">
          {CHAIR_AMENITIES.map((a) => (
            <label
              key={a.id}
              className="flex items-center gap-2 text-xs cursor-pointer text-foreground/90"
            >
              <Checkbox
                checked={filters.amenities.includes(a.id)}
                onCheckedChange={() => toggleAmenity(a.id)}
              />
              {a.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
