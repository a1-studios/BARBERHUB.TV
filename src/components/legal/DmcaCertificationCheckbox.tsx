import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';

interface Props {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
}

export function DmcaCertificationCheckbox({ checked, onCheckedChange, id = 'dmca-cert' }: Props) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 rounded-[12px] border border-cyan-500/25 bg-background/60 p-3 cursor-pointer hover:border-cyan-500/50 transition-colors"
    >
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(!!v)} className="mt-0.5" />
      <span className="text-xs leading-relaxed text-white/80">
        I certify that I have the rights to this content or that my use falls under fair use.
        I acknowledge BarberHub's{' '}
        <Link to="/dmca" target="_blank" className="text-cyan-400 underline">
          DMCA policy
        </Link>{' '}
        and that my account may be terminated for repeat copyright infringement.
      </span>
    </label>
  );
}
