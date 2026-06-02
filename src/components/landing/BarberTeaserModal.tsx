import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, MapPin, Calendar, ArrowRight } from "lucide-react";
import { FEATURED_BARBERS_TEASER } from "@/data/featuredBarbersTeaser";

export type TeaserAction = "find" | "book";

interface BarberTeaserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: TeaserAction;
  city?: string;
  country?: string;
  flag?: string;
}

const TIER_COLORS: Record<string, string> = {
  Diamond: "from-cyan-300 to-white text-black",
  Gold: "from-yellow-400 to-amber-500 text-black",
  Silver: "from-zinc-300 to-zinc-100 text-black",
  Bronze: "from-amber-700 to-amber-500 text-black",
};

export function BarberTeaserModal({ open, onOpenChange, action, city, flag }: BarberTeaserModalProps) {
  const navigate = useNavigate();
  const title = action === "book" ? `Book a barber${city ? ` in ${city}` : ""}` : `Find barbers${city ? ` in ${city}` : " near you"}`;

  const goSignup = () => {
    onOpenChange(false);
    navigate("/?tab=signup");
  };
  const goSignin = () => {
    onOpenChange(false);
    navigate("/");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-orange-400/30 bg-black/95 backdrop-blur-xl">
        <div className="relative p-5 pb-3 bg-gradient-to-br from-orange-500/15 via-transparent to-cyan-500/10 border-b border-white/5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-orange-400 font-bold mb-2">
            <Sparkles className="w-3 h-3" />
            {flag} Live preview
          </div>
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-xl font-black text-white leading-tight">{title}</DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Sign up free to unlock these elite barbers, instant booking, and Barber Bucks rewards.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-4 space-y-2 max-h-[55vh] overflow-y-auto">
          {FEATURED_BARBERS_TEASER.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-orange-400/40 transition relative overflow-hidden"
            >
              <div
                className={`w-11 h-11 shrink-0 rounded-full bg-gradient-to-br ${TIER_COLORS[b.tier]} flex items-center justify-center font-black text-sm shadow-lg`}
                aria-hidden
              >
                {b.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white truncate">{b.name}</span>
                  <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                    {b.tier}
                  </span>
                </div>
                <div className="text-[11px] text-white/50 truncate">
                  {b.flag} {b.city} · {b.specialty}
                </div>
              </div>
              <div className="text-[10px] font-semibold text-orange-400/80 blur-[2px] select-none">Book</div>
            </div>
          ))}
          <div className="text-center text-[10px] text-white/40 pt-1">
            + {action === "book" ? "instant booking" : "500+ barbers"} unlocked after signup
          </div>
        </div>

        <div className="p-4 pt-2 space-y-2 border-t border-white/5 bg-black/60">
          <Button
            onClick={goSignup}
            className="w-full h-11 bg-orange-500 hover:bg-orange-400 text-black font-bold shadow-[0_0_24px_rgba(255,140,40,0.45)]"
          >
            {action === "book" ? <Calendar className="w-4 h-4 mr-1.5" /> : <MapPin className="w-4 h-4 mr-1.5" />}
            Create free account
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
          <button
            onClick={goSignin}
            className="w-full text-xs text-white/60 hover:text-white transition py-1"
          >
            I already have an account — Sign in
          </button>
          <p className="text-center text-[10px] text-white/35">Free to join · Pay only when you book</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BarberTeaserModal;
