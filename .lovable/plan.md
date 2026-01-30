
# Arena Gate - World Cup Nationality Selection Flow

## Overview

Build a standalone "Arena Gate" component that creates a ceremonial, stadium-themed nationality selection experience for barbers before sign-up. This is a pre-sign-up gatekeeper that establishes the competitive, premium feel of the World Cup of Barbering.

## Design Vision

The Arena Gate creates a "World Cup Draft Night" atmosphere:
- Dark stadium background with spotlight effect
- Horizontal flag carousel with 3D depth
- Signature "clipper swipe" gesture to confirm nationality
- Bot detection via gesture physics analysis
- "Fresh!" celebration animation on success

## Technical Architecture

```text
+---------------------------+
|      ArenaGateModal       |
|  +-----------------------+|
|  |   StadiumBackground   ||
|  |  +------------------+ ||
|  |  | FlagCarousel     | ||
|  |  | (framer-motion)  | ||
|  |  +------------------+ ||
|  |  +------------------+ ||
|  |  | SwipeVerifier    | ||
|  |  | (gesture track)  | ||
|  |  +------------------+ ||
|  +-----------------------+|
+---------------------------+
         |
         v
  AuthDialog (receives verified data)
```

## Phase-by-Phase Implementation

### Phase 1: Core Component Structure

**New Files:**
| File | Purpose |
|------|---------|
| `src/components/auth/ArenaGateModal.tsx` | Main modal container with stadium theme |
| `src/components/auth/FlagCarousel.tsx` | Horizontal flag carousel with 3D transforms |
| `src/components/auth/ClipperSwipeVerifier.tsx` | Gesture tracking and verification |
| `src/hooks/useGestureVerification.tsx` | Physics tracking for bot detection |

### Phase 2: Visual Design - Stadium Theme

**StadiumBackground styling:**
- Full-screen dark modal with radial gradient (`bg-[radial-gradient(ellipse_at_center,_#1a1a2e_0%,_#0f0f17_50%,_#000_100%)]`)
- Spotlight beam SVG pointing at selected flag
- Subtle crowd texture pattern in background
- Animated ambient particles (like stadium dust/confetti)

**Layout:**
```text
+----------------------------------------+
|  [X]                ARENA GATE         |
|        ___________________________     |
|       /   WORLD CUP OF BARBERING  \    |
|      |                             |   |
|      |    🇺🇸  🇬🇧 [🇧🇷] 🇯🇵  🇳🇬    |   |
|      |         ^ spotlight          |   |
|      |___________________________|     |
|                                        |
|      REPRESENT YOUR NATION             |
|      Swipe the clipper to confirm      |
|                                        |
|      [====✂️===========]               |
|        ^ diagonal swipe zone           |
+----------------------------------------+
```

### Phase 3: Flag Carousel Implementation

**FlagCarousel.tsx** using framer-motion:
- Horizontal scroll with snap-to-center behavior
- 3D perspective transforms (`perspective: 1000px`)
- Selected flag scales up (1.2x) with glow effect
- Non-selected flags have reduced opacity and scale
- Touch/drag to browse, click to select

**Carousel State:**
```tsx
interface FlagCarouselProps {
  countries: Array<{ code: string; name: string }>;
  selectedCountry: string | null;
  onSelect: (code: string) => void;
}

// Uses useMotionValue for x position
// useTransform for 3D depth effects per flag
// AnimatePresence for selection spotlight
```

**Inline SVG Flags:**
- Use emoji flags (existing `getCountryFlag` function from CountrySelector)
- Render at 64x64px with glow border on selection
- Keep under 50kb by using native emoji rendering

### Phase 4: Clipper Swipe Verifier - The Signature Gesture

**ClipperSwipeVerifier.tsx:**
- Diagonal swipe zone (45-degree angle target)
- User drags a clipper icon from bottom-left to top-right
- Track gesture physics: velocity, angle, jitter

**Gesture Data Collected:**
```tsx
interface SwipeMetrics {
  startTime: number;
  endTime: number;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  pathPoints: Array<{ x: number; y: number; t: number }>;
  velocity: number;         // pixels per ms
  angle: number;            // degrees from horizontal
  jitterVariance: number;   // deviation from perfect line
}
```

**Bot Detection Logic:**
```tsx
const validateHumanGesture = (metrics: SwipeMetrics): boolean => {
  // 1. Check angle is roughly diagonal (30-60 degrees)
  const angleDiff = Math.abs(metrics.angle - 45);
  if (angleDiff > 25) return false;

  // 2. Check velocity is human-like (not instant, not too slow)
  if (metrics.velocity < 0.3 || metrics.velocity > 5) return false;

  // 3. Critical: Check jitter variance (humans are never perfectly straight)
  // If path variance is < 2px, likely a bot
  if (metrics.jitterVariance < 2) return false;

  // 4. Check duration is reasonable (200ms - 2000ms)
  const duration = metrics.endTime - metrics.startTime;
  if (duration < 200 || duration > 2000) return false;

  return true;
};
```

### Phase 5: Success Animation & Haptics

**"Fresh!" Animation on valid swipe:**
```tsx
// 1. Haptic burst
HapticFeedback.winner(); // Uses existing pattern

// 2. Visual celebration
CelebrationEffects.winner('left'); // Confetti burst

// 3. Text animation
<motion.div
  initial={{ scale: 0, opacity: 0 }}
  animate={{ scale: [0, 1.2, 1], opacity: 1 }}
  className="text-4xl font-black text-primary"
>
  FRESH! ✂️
</motion.div>
```

### Phase 6: State Management & Data Flow

**ArenaGateModal State:**
```tsx
const [step, setStep] = useState<'select' | 'verify' | 'success'>('select');
const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
const [verificationToken, setVerificationToken] = useState<string | null>(null);
```

**Verification Token Generation:**
```tsx
// Generate a simple client-side token with timestamp + metrics hash
const generateVerificationToken = (country: string, metrics: SwipeMetrics): string => {
  const payload = {
    country,
    timestamp: Date.now(),
    velocity: metrics.velocity.toFixed(2),
    jitter: metrics.jitterVariance.toFixed(2),
  };
  return btoa(JSON.stringify(payload));
};
```

**Data Passed to Sign-Up:**
```tsx
interface ArenaGateResult {
  selectedCountry: string;
  verificationToken: string;
  verified: boolean;
}

// Callback when gate is passed:
onComplete: (result: ArenaGateResult) => void;
```

### Phase 7: Integration Points

**Entry Point:**
- When user selects "Barber" role in RoleSelection, instead of immediately proceeding, open ArenaGateModal
- ArenaGateModal completion passes verified country to AuthDialog

**Modified Flow:**
```text
RoleSelection (user clicks Barber)
    └─> ArenaGateModal opens
        └─> User selects country
        └─> User does clipper swipe
        └─> On success: onComplete({ country, token })
            └─> AuthDialog opens with pre-filled country
```

**No Auth Listener Conflicts:**
- ArenaGate is purely UI/state - no Supabase calls
- Only passes data forward, doesn't interact with auth

## Files to Create

| File | Size Est. | Purpose |
|------|-----------|---------|
| `src/components/auth/ArenaGateModal.tsx` | ~8kb | Main modal with stadium theme |
| `src/components/auth/FlagCarousel.tsx` | ~6kb | 3D flag selection carousel |
| `src/components/auth/ClipperSwipeVerifier.tsx` | ~5kb | Gesture tracking zone |
| `src/hooks/useGestureVerification.tsx` | ~3kb | Physics validation logic |
| `src/components/auth/FreshAnimation.tsx` | ~2kb | Success celebration overlay |

**Total estimated: ~24kb** (well under 50kb limit)

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/auth/RoleSelector.tsx` | Trigger ArenaGateModal when barber is selected |
| `src/components/auth/AuthDialog.tsx` | Accept pre-filled country from ArenaGate |
| `src/utils/hapticFeedback.ts` | Add `confirm` pattern for swipe success |

## Component Props Summary

```tsx
// ArenaGateModal
interface ArenaGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: { country: string; token: string }) => void;
}

// FlagCarousel
interface FlagCarouselProps {
  selectedCountry: string | null;
  onSelect: (code: string) => void;
}

// ClipperSwipeVerifier
interface ClipperSwipeVerifierProps {
  onVerified: (metrics: SwipeMetrics) => void;
  onFailed: (reason: string) => void;
  disabled?: boolean;
}
```

## Visual Details

**Spotlight Effect:**
- SVG cone shape pointing at selected flag
- Animated opacity pulse
- Color: `hsl(187 100% 50%)` (cyan glow)

**Clipper Icon:**
- Lucide `Scissors` icon rotated 45 degrees
- Draggable with `motion.div` and `drag` prop
- Trail effect showing swipe path

**Flag Selection Glow:**
- `box-shadow: 0 0 30px hsl(var(--primary) / 0.6)`
- Scale: 1.2x when selected
- Border: 3px solid primary

## Mobile Optimizations

- Touch-optimized swipe zone (min 100px height)
- Haptic feedback on all interactions
- Full-screen modal on mobile
- Swipe instructions adapted for touch ("Swipe" vs "Drag")

## Summary

This creates a premium, stadium-themed nationality selection that:
1. Builds anticipation for the World Cup experience
2. Adds a unique "clipper swipe" verification gesture
3. Implements basic bot detection via gesture physics
4. Triggers celebratory feedback on success
5. Seamlessly hands off to the existing auth flow

The implementation stays lightweight (under 50kb), uses existing patterns (framer-motion, haptics, celebration effects), and doesn't interfere with Supabase auth.
