
# Logic Refinement: Voting After Battle Completion + Video Placeholder

## Summary

Refine the battle hero component to correctly implement the voting flow:
1. **Voting is only allowed when battles are in "voting" status** (after stream ends and videos are saved)
2. **Add a demo/placeholder mode** that simulates a completed battle with video placeholders, allowing users to see and test the vote buttons
3. **Role-based UI** - Fans see vote buttons, non-participating barbers see "Explore" button

---

## Current Issue

Looking at the code:
- Line 254: `const isActiveBattle = battle?.status === 'active' || battle?.status === 'voting';`
- Lines 295 & 390: Vote buttons appear when `isActiveBattle && !isCurrentUserInBattle`

**Problem**: Vote buttons currently show during `active` status (live streaming), but per the memory context, voting should ONLY happen AFTER battles conclude when status is `voting`.

Additionally, there are no battles with `voting` status in the database - only `active` and `upcoming`. So users never see vote buttons under the correct conditions.

---

## Solution Design

### 1. Correct Voting Logic

Change the condition for showing vote buttons:

```text
BEFORE: isActiveBattle = status === 'active' OR status === 'voting'
        → Vote buttons show for BOTH

AFTER:  isVotingPhase = status === 'voting' (ONLY)
        → Vote buttons ONLY show during voting phase
        
        isLiveBattle = status === 'active' 
        → Shows LIVE badge, viewer counts, progress bar (no voting)
```

### 2. Demo/Simulation Mode with Video Placeholder

Since there are no `voting` status battles yet, add a **simulation mode** that:
- Shows when NO real battle exists OR when no `voting` battle exists
- Uses placeholder animated video graphics instead of "No video available"
- Enables vote buttons so users can experience the voting flow
- Labels it clearly as "DEMO BATTLE" so users know it's for simulation

```text
┌─────────────────────────────────────────────────────────┐
│  ⚡ DEMO BATTLE ⚡                                       │
│                                                         │
│  ┌─────────────────┐    VS    ┌─────────────────┐      │
│  │                 │          │                 │      │
│  │  🔥 ARENA      │          │  🔥 ARENA      │      │
│  │  INCOMING 🔥   │          │  INCOMING 🔥   │      │
│  │                 │          │                 │      │
│  └─────────────────┘          └─────────────────┘      │
│                                                         │
│  [ Vote CJ ]                        [ Vote Style ]      │
│                                                         │
│  ══════════════════════════════════════════════════    │
│                    50% | 50%                            │
└─────────────────────────────────────────────────────────┘
```

### 3. Role-Based Buttons (as previously planned)

| User Type | Voting Phase | Live Phase | Demo Mode |
|-----------|-------------|------------|-----------|
| Fan | Vote buttons | Watch only | Vote buttons (demo) |
| Barber (not in battle) | Explore button | Watch only | Explore button |
| Barber (in battle) | Status indicator | Stream controls | N/A |

---

## Technical Changes

### File 1: `src/components/DynamicBattleHero.tsx`

**Add role hook and new state variables:**
```tsx
import { useUserRole } from '@/hooks/useUserRole';
import { Compass } from 'lucide-react';

// Inside component:
const { isBarber, isFan } = useUserRole();

// New state for demo mode
const [isDemoMode, setIsDemoMode] = useState(false);
```

**Separate voting phase from live phase (line ~254):**
```tsx
// OLD:
const isActiveBattle = battle?.status === 'active' || battle?.status === 'voting';

// NEW:
const isLiveBattle = battle?.status === 'active';
const isVotingPhase = battle?.status === 'voting';
const isActiveBattle = isLiveBattle || isVotingPhase;

// Demo mode when no real voting battle exists
const showDemoMode = !battle || (!isVotingPhase && displayBarbers.length >= 2);
```

**Update vote button rendering (lines 294-295 and 389-390):**
```tsx
{/* Vote buttons - ONLY during voting phase or demo mode, ONLY for fans */}
{((isVotingPhase || showDemoMode) && !isCurrentUserInBattle) && (
  isFan || !user ? (
    <VoteButton 
      name={barber1.display_name || barber1.name} 
      variant="primary" 
      onVote={() => handleVote(1)} 
    />
  ) : isBarber ? (
    <motion.button
      onClick={() => navigate('/arena/explore')}
      className="px-2 py-0.5 rounded text-[8px] font-medium border bg-cyan/20 border-cyan/40 hover:bg-cyan/40 text-cyan flex items-center gap-1"
      whileTap={{ scale: 0.95 }}
    >
      <Compass className="w-2.5 h-2.5" />
      Explore
    </motion.button>
  ) : null
)}
```

**Add DEMO badge when in demo mode:**
```tsx
{showDemoMode && (
  <motion.div 
    className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-cyan text-white text-xs font-bold"
    animate={{ scale: [1, 1.05, 1] }}
    transition={{ duration: 1.5, repeat: Infinity }}
  >
    ⚡ DEMO BATTLE ⚡
  </motion.div>
)}
```

**Show progress bar in demo mode too:**
```tsx
// Change line 422:
{(isActiveBattle || showDemoMode) && <div className="absolute bottom-0...
```

### File 2: `src/components/barber/BarberVideoSection.tsx`

**Replace the empty state (lines 136-143) with animated arena placeholder:**

```tsx
// Show animated arena placeholder for non-owners (demo/simulation mode)
return (
  <div className={`${aspectClass} bg-gradient-to-br from-primary/30 via-black to-cyan/20 rounded-lg border border-primary/30 flex items-center justify-center overflow-hidden ${className}`}>
    <div className="relative text-center space-y-3">
      {/* Animated rotating barber pole effect */}
      <motion.div
        animate={{ 
          rotate: [0, 360],
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          rotate: { duration: 4, repeat: Infinity, ease: "linear" },
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
        className="w-16 h-16 mx-auto relative"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-white to-cyan opacity-60" />
        <div className="absolute inset-2 rounded-full bg-black/80 flex items-center justify-center">
          <Play className="w-6 h-6 text-primary" />
        </div>
      </motion.div>
      
      {/* Pulsing text */}
      <motion.div
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="space-y-1"
      >
        <p className="text-lg font-bold text-primary drop-shadow-lg">
          🔥 ARENA INCOMING 🔥
        </p>
        <p className="text-xs text-white/70">Battle starting soon...</p>
      </motion.div>
      
      {/* Radial glow */}
      <motion.div
        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 rounded-full bg-primary/20 blur-xl -z-10"
      />
    </div>
  </div>
);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/DynamicBattleHero.tsx` | Add `useUserRole`, separate `isVotingPhase` from `isLiveBattle`, add demo mode logic, role-based buttons |
| `src/components/barber/BarberVideoSection.tsx` | Replace "No video available" with animated arena placeholder |

---

## Logic Flow Summary

```text
User visits Arena page
         │
         ▼
   Is there a battle with status = "voting"?
         │
    ┌────┴────┐
   YES        NO
    │          │
    ▼          ▼
Real voting   Demo mode
 buttons      enabled
    │          │
    ▼          ▼
  Is user a Fan?  ────► Show Vote buttons
  Is user a Barber? ──► Show "Explore" button
  Is user Guest? ─────► Show Vote buttons (will prompt sign-in on click)
```

This approach:
1. Correctly gates voting to ONLY `voting` status (real battles)
2. Provides demo mode so users can experience the voting UI before real battles exist
3. Adds role-based actions (Fans vote, Barbers explore)
4. Replaces empty video states with exciting animated placeholders
