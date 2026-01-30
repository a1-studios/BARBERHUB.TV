

# Arena Gate Integration & Role System Enhancement

## Summary

This plan integrates the Arena Gate ceremony directly into the landing page sign-up flow, adds visual distinction between Barber (orange) and Fan (cyan) roles, and ensures the role system works seamlessly across the entire application.

## Problem Analysis

The Arena Gate system (`ArenaGateModal`, `FlagCarousel`, `ClipperSwipeVerifier`) we built is completely disconnected from the actual sign-up flow:

1. **`LandingHero.tsx`** has its own inline `UserTypeSelector` that ignores the Arena Gate
2. When users click "BARBER", nothing special happens - just highlights the button
3. Both roles currently use the same orange color scheme with no visual differentiation

## Solution Design

### Visual Design: Orange vs Cyan Role Contrast

```text
┌────────────────────────────┐  ┌────────────────────────────┐
│      ✂️ BARBER             │  │        👥 FAN              │
│   ┌────────────────┐       │  │   ┌────────────────┐       │
│   │ Orange primary │       │  │   │ Cyan primary   │       │
│   │ Orange glow    │       │  │   │ Cyan glow      │       │
│   │ Orange border  │       │  │   │ Cyan border    │       │
│   └────────────────┘       │  │   └────────────────┘       │
│   "Professional Service"   │  │   "Community Member"       │
└────────────────────────────┘  └────────────────────────────┘
```

### Sign-Up Flow

**For Barbers:**
1. User clicks "BARBER" role button
2. Arena Gate Modal opens (stadium theme)
3. User selects country via 3D flag carousel
4. User performs clipper swipe verification
5. "FRESH!" celebration plays
6. Modal closes, form shows locked country with "✓ Verified" badge
7. User completes remaining fields

**For Fans:**
1. User clicks "FAN" role button (cyan highlight)
2. No Arena Gate required
3. Country dropdown optional (cyan-themed)
4. User fills fields normally

---

## Technical Implementation

### File 1: `src/components/LandingHero.tsx`

**New imports:**
```tsx
import { ArenaGateModal, ArenaGateResult } from '@/components/auth/ArenaGateModal';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
```

**New state variables:**
```tsx
const [showArenaGate, setShowArenaGate] = useState(false);
const [arenaGateVerified, setArenaGateVerified] = useState(false);
```

**Arena Gate handlers:**
```tsx
const handleArenaGateComplete = (result: ArenaGateResult) => {
  setSignUpData(prev => ({
    ...prev,
    userType: 'barber',
    countryCode: result.selectedCountry
  }));
  setArenaGateVerified(true);
  setShowArenaGate(false);
};

const handleArenaGateClose = () => {
  // If they close without completing, reset to fan
  setShowArenaGate(false);
  if (!arenaGateVerified) {
    setSignUpData(prev => ({
      ...prev,
      userType: 'fan',
      countryCode: null
    }));
  }
};
```

**Updated handleSignUp with validation:**
```tsx
const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Barbers MUST complete Arena Gate
  if (signUpData.userType === 'barber' && !arenaGateVerified) {
    toast.error('Please complete the Arena Gate verification');
    setShowArenaGate(true);
    return;
  }
  
  // Barbers MUST have country selected
  if (signUpData.userType === 'barber' && !signUpData.countryCode) {
    toast.error('Please complete nationality verification');
    setShowArenaGate(true);
    return;
  }
  
  setLoading(true);
  const { error } = await signUp(signUpData.email, signUpData.password, signUpData.displayName, signUpData.userType, signUpData.countryCode || undefined);
  setLoading(false);
};
```

**Updated UserTypeSelector with cyan/orange contrast:**
```tsx
const UserTypeSelector = () => (
  <div className="space-y-4">
    <Label className="text-sm font-medium">I am a:</Label>
    <div className="grid grid-cols-2 gap-3">
      {/* BARBER Button - Orange Theme */}
      <button 
        type="button" 
        onClick={() => {
          if (!arenaGateVerified) {
            setShowArenaGate(true);
          }
          setSignUpData(prev => ({ ...prev, userType: "barber" }));
        }} 
        className={`relative p-4 border transition-all duration-300 ${
          signUpData.userType === "barber" 
            ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_hsl(24_100%_52%/0.3),inset_0_0_15px_hsl(24_100%_52%/0.1)]" 
            : "border-border/50 bg-card/50 hover:border-primary/30 hover:shadow-[0_0_15px_hsl(24_100%_52%/0.2)]"
        }`} 
        style={{ borderRadius: '1rem' }}
      >
        <div className="flex flex-col items-center space-y-2">
          <div className={`p-2 rounded-full ${
            signUpData.userType === "barber" 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted"
          }`}>
            <Scissors className="w-5 h-5" />
          </div>
          <div className="text-center">
            <div className="font-semibold text-sm">BARBER</div>
            <div className="text-xs text-muted-foreground">Professional Service</div>
          </div>
        </div>
        {signUpData.userType === "barber" && arenaGateVerified && (
          <div className="absolute -top-1 -right-1">
            <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
              ✓ Verified
            </Badge>
          </div>
        )}
      </button>

      {/* FAN Button - Cyan Theme */}
      <button 
        type="button" 
        onClick={() => {
          setSignUpData(prev => ({ ...prev, userType: "fan" }));
          // Reset arena gate state when switching to fan
          setArenaGateVerified(false);
        }} 
        className={`relative p-4 border transition-all duration-300 ${
          signUpData.userType === "fan" 
            ? "border-cyan-500/50 bg-cyan-500/5 shadow-[0_0_20px_rgba(0,217,255,0.3),inset_0_0_15px_rgba(0,217,255,0.1)]" 
            : "border-border/50 bg-card/50 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(0,217,255,0.2)]"
        }`} 
        style={{ borderRadius: '1rem' }}
      >
        <div className="flex flex-col items-center space-y-2">
          <div className={`p-2 rounded-full ${
            signUpData.userType === "fan" 
              ? "bg-cyan-500 text-black" 
              : "bg-muted"
          }`}>
            <Users className="w-5 h-5" />
          </div>
          <div className="text-center">
            <div className="font-semibold text-sm">FAN</div>
            <div className="text-xs text-muted-foreground">Community Member</div>
          </div>
        </div>
        {signUpData.userType === "fan" && (
          <div className="absolute -top-1 -right-1">
            <Badge className="text-xs bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              Selected
            </Badge>
          </div>
        )}
      </button>
    </div>
  </div>
);
```

**Updated Country Selector section:**
```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <Label>Country</Label>
    {signUpData.userType === 'barber' && arenaGateVerified && (
      <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
        <Lock className="h-3 w-3 mr-1" />
        Verified
      </Badge>
    )}
  </div>
  <CountrySelector 
    value={signUpData.countryCode} 
    onChange={countryCode => {
      if (!arenaGateVerified) {
        setSignUpData(prev => ({ ...prev, countryCode }));
      }
    }} 
    placeholder={arenaGateVerified ? "Nationality locked" : "Select your country"}
    disabled={arenaGateVerified}
  />
  {signUpData.userType === 'barber' && arenaGateVerified && (
    <p className="text-xs text-amber-500/80 flex items-center gap-1">
      <Lock className="h-3 w-3" />
      Nationality cannot be changed after sign-up
    </p>
  )}
  {signUpData.userType === 'fan' && (
    <p className="text-xs text-muted-foreground">
      Optional - helps connect with local barbers
    </p>
  )}
</div>
```

**Add Arena Gate Modal at end of component:**
```tsx
{/* Arena Gate for Barbers */}
<ArenaGateModal
  isOpen={showArenaGate}
  onClose={handleArenaGateClose}
  onComplete={handleArenaGateComplete}
/>
```

---

### File 2: `src/components/RoleBadge.tsx`

**Update Fan badge to use cyan:**
```tsx
if (isFan) {
  return (
    <Badge 
      variant="secondary" 
      className={`bg-gradient-to-r from-cyan-500/20 to-cyan-400/10 text-cyan-400 border border-cyan-500/30 ${sizeClasses[size]} ${className}`}
    >
      <Users className={`${iconSize[size]} mr-1`} />
      Fan
    </Badge>
  );
}
```

---

### File 3: `src/components/auth/AuthDialog.tsx`

**Same Arena Gate integration pattern:**

Add state and handlers:
```tsx
const [showArenaGate, setShowArenaGate] = useState(false);
const [arenaGateVerified, setArenaGateVerified] = useState(!!prefilledCountry);
```

Update barber button to trigger Arena Gate:
```tsx
<button
  type="button"
  onClick={() => {
    if (!arenaGateVerified) {
      setShowArenaGate(true);
    }
    setSignUpData(prev => ({ ...prev, userType: "barber" }));
  }}
  className={`... ${
    signUpData.userType === "barber" 
      ? "border-primary bg-primary/10" 
      : "border-border hover:border-primary/50"
  }`}
>
```

Update fan button with cyan theme:
```tsx
<button
  type="button"
  onClick={() => {
    setSignUpData(prev => ({ ...prev, userType: "fan" }));
    setArenaGateVerified(false);
  }}
  className={`... ${
    signUpData.userType === "fan" 
      ? "border-cyan-500 bg-cyan-500/10" 
      : "border-border hover:border-cyan-500/50"
  }`}
>
```

Add Arena Gate Modal at end.

---

## Role System Verification

The existing role system is already properly integrated across the app:

| Component | Role Check | Purpose |
|-----------|------------|---------|
| `Header.tsx` | `useUserRole` | Filter navigation items by `barberOnly`/`adminOnly` |
| `Index.tsx` | `isBarber` | Show Creator Hub only to barbers |
| `BattlesPage.tsx` | `isBarber`, `isFan` | Different battle actions per role |
| `AdminGuard.tsx` | `isAdmin` | Protect admin routes |
| `BarberGuard.tsx` | `isBarber` | Protect barber-only routes |
| `AuthGuard.tsx` | `user` | Protect authenticated routes |
| `ChallengeFeed.tsx` | `isBarber` | Show accept challenge for barbers only |
| `QuickActionsMenu.tsx` | `isBarber`, `isAdmin` | Filter quick actions |
| `Profile.tsx` | `isBarber` | Show different profile layouts |

All these continue to work because:
1. `useAuth` passes `user_type` to Supabase metadata
2. Database trigger creates `user_roles` entry
3. `useUserRole` reads from `user_roles` table
4. Guards and components consume the role flags

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/LandingHero.tsx` | Import ArenaGateModal, add Arena Gate state/handlers, update UserTypeSelector with orange/cyan contrast, lock country after verification, add validation in handleSignUp, render ArenaGateModal |
| `src/components/auth/AuthDialog.tsx` | Same Arena Gate integration, add cyan styling for fan role |
| `src/components/RoleBadge.tsx` | Update Fan badge to use cyan gradient |

---

## Data Permanence Summary

After account creation, the following CANNOT be changed:
- **Role** (barber/fan) - set at sign-up
- **Nationality** - set via Arena Gate for barbers (mandatory), optional dropdown for fans
- **Display Name** - set at sign-up
- **Email** - for login purposes

Only **password** can be reset via email.

---

## Flow Diagrams

### Barber Sign-Up Flow
```text
[Click BARBER] → [Arena Gate Opens]
      ↓
[3D Flag Carousel] → [Select Country]
      ↓
[Clipper Swipe Verification] → [FRESH! Animation]
      ↓
[Form: Country Locked ✓] → [Fill Name/Email/Password]
      ↓
[Create Account] → [Account with permanent nationality]
```

### Fan Sign-Up Flow
```text
[Click FAN] → [Form with Cyan styling]
      ↓
[Optional Country Dropdown] → [Fill Name/Email/Password]
      ↓
[Create Account] → [Regular account]
```

---

## Summary

This implementation:
1. **Integrates** Arena Gate into the barber sign-up flow on the landing page
2. **Creates visual distinction** with orange for barbers, cyan for fans
3. **Enforces** mandatory Arena Gate completion for barbers before sign-up
4. **Locks** nationality after Arena Gate verification with clear visual feedback
5. **Maintains** existing role logic across all components (no changes needed)
6. **Keeps lightweight** - no new dependencies, minimal additions

