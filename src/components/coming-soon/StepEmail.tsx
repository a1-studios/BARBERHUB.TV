import { useState, useRef, useEffect } from 'react';
import { z } from 'zod';
import { ArrowRight, AlertCircle, Mail } from 'lucide-react';
import { SwipeableStep } from './SwipeableStep';
import { useStepDirection } from './LaunchWizard';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(255, 'Email is too long')
  .email('Enter a valid email address');

interface StepEmailProps {
  initialEmail: string;
  onContinue: (email: string) => void;
  onSkip: () => void;
}

const haptic = () => {
  try { navigator.vibrate?.(10); } catch { /* ignore */ }
};

export const StepEmail = ({ initialEmail, onContinue, onSkip }: StepEmailProps) => {
  const direction = useStepDirection();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Slight delay so the slide animation finishes before keyboard pops
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const validation = emailSchema.safeParse(email);
  const valid = validation.success;

  const submit = () => {
    setTouched(true);
    if (!valid) {
      setError(validation.error.errors[0].message);
      return;
    }
    haptic();
    onContinue(validation.data);
  };

  return (
    <SwipeableStep
      direction={direction}
      canAdvance={valid}
      onSwipeNext={submit}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="space-y-7"
      >
        <div className="text-center space-y-3">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-1"
            style={{
              background: 'radial-gradient(circle, rgba(255,140,0,0.35), transparent 70%)',
              border: '1px solid rgba(255,95,31,0.45)',
              boxShadow: '0 0 30px rgba(255,95,31,0.4)',
            }}
          >
            <Mail className="w-7 h-7 text-orange-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            Reserve your seat
          </h2>
          <p className="text-sm text-white/65 max-w-xs mx-auto">
            Drop your email — we'll save your spot in the arena.
          </p>
        </div>

        <div className="relative">
          {/* Floating label */}
          <label
            htmlFor="ls-email"
            className={`absolute left-4 pointer-events-none transition-all duration-200 ${
              focused || email.length > 0
                ? 'top-1.5 text-[10px] uppercase tracking-wider text-orange-400 font-bold'
                : 'top-1/2 -translate-y-1/2 text-sm text-white/40'
            }`}
          >
            Email address
          </label>
          <input
            ref={inputRef}
            id="ls-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onFocus={() => setFocused(true)}
            onChange={(e) => {
              setEmail(e.target.value);
              if (touched) {
                const r = emailSchema.safeParse(e.target.value);
                setError(r.success ? null : r.error.errors[0].message);
              }
            }}
            onBlur={() => {
              setFocused(false);
              setTouched(true);
              const r = emailSchema.safeParse(email);
              setError(r.success ? null : r.error.errors[0].message);
            }}
            className="w-full h-14 px-4 pt-4 rounded-[14px] bg-black/40 text-white text-base font-medium focus:outline-none transition-all"
            style={{
              border: focused ? '1px solid rgb(255,95,31)' : '1px solid rgba(255,95,31,0.3)',
              boxShadow: focused ? '0 0 22px rgba(255,95,31,0.55), 0 0 0 2px rgba(255,95,31,0.2)' : 'none',
            }}
          />
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5 mt-2 px-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}
        </div>

        <DualLayerButton type="submit" disabled={!valid && touched} onClick={submit}>
          Continue <ArrowRight className="w-4 h-4" />
        </DualLayerButton>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-white/40">🔒 No spam, promise.</span>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-white/50 hover:text-orange-400 transition-colors"
          >
            Skip
          </button>
        </div>
      </form>
    </SwipeableStep>
  );
};

/** Dual-layer pill button with white border + orange gradient + top streak. */
const DualLayerButton = ({
  children,
  type = 'button',
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
}) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    onPointerDown={() => haptic()}
    className="relative w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 overflow-hidden transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    style={{
      background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
      border: '1px solid rgba(255,255,255,0.3)',
      boxShadow: '0 8px 24px rgba(255,95,31,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
    }}
  >
    {children}
  </button>
);
