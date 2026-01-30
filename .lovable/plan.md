
# Maximize Contender Theater Screen Real Estate

## Problem Analysis

Looking at the current implementation vs the screenshot:

1. **Wasted space**: The video container has:
   - `pt-20 pb-32 px-4` padding on desktop (line 193)
   - `max-w-7xl` constraint limits full-width usage
   - Large gaps above and below the video content

2. **Static 50/50 layout**: Currently shows split view even when opponent hasn't joined
   - Barber should see their camera **larger** (70-80%) when waiting for opponent
   - Switch to **50/50** only when opponent actually connects

3. **Top/bottom bars take too much vertical space**: Can be slimmer and more overlay-like

## Solution Design

### Layout States

| State | Local Video | Opponent Video |
|-------|-------------|----------------|
| **Preview Mode** (waiting for opponent) | 70-80% of screen width | Small "waiting" indicator (20-30%) |
| **Battle Mode** (opponent connected) | 50% split | 50% split |
| **Mobile** | Keep PIP layout | Works as designed |

### Visual Comparison

**Before** (current - always 50/50):
```text
┌──────────────────────────────────────────────────────┐
│  ← Title                              LIVE  👁 ⏱ ⛶  │
├──────────────────────────────────────────────────────┤
│                                                      │
│        large padding/margin wasted space             │
│                                                      │
│   ┌─────────────────┐   VS   ┌─────────────────┐    │
│   │   YOUR SIDE     │        │   Waiting...    │    │
│   │                 │        │                 │    │
│   │    50% width    │        │    50% width    │    │
│   └─────────────────┘        └─────────────────┘    │
│                                                      │
│        large padding/margin wasted space             │
│                                                      │
├──────────────────────────────────────────────────────┤
│         🎤   📹   [END]   💬   ⚙️                     │
└──────────────────────────────────────────────────────┘
```

**After** (preview mode - barber gets bigger view):
```text
┌──────────────────────────────────────────────────────┐
│  ← Title                              LIVE  👁 ⏱ ⛶  │  ← slimmer overlay
├──────────────────────────────────────────────────────┤
│ ┌──────────────────────────────┐  ┌────────────────┐ │
│ │                              │  │  Waiting for   │ │
│ │                              │  │   opponent...  │ │
│ │        YOUR SIDE             │VS│                │ │
│ │        70% width             │  │    30% width   │ │
│ │                              │  │                │ │
│ │                              │  └────────────────┘ │
│ │                              │                     │
│ └──────────────────────────────┘                     │
├──────────────────────────────────────────────────────┤
│    🎤   📹   [GO LIVE]   💬   ⚙️    0 viewers        │  ← slimmer overlay
└──────────────────────────────────────────────────────┘
```

**After** (battle mode - opponent connected):
```text
┌──────────────────────────────────────────────────────┐
│  ← Title                              LIVE  👁 ⏱ ⛶  │
├──────────────────────────────────────────────────────┤
│ ┌────────────────────────┐  VS  ┌────────────────────┤
│ │                        │      │                    │
│ │      YOUR SIDE         │      │     OPPONENT       │
│ │      50% width         │      │     50% width      │
│ │                        │      │                    │
│ └────────────────────────┘      └────────────────────┤
├──────────────────────────────────────────────────────┤
│    🎤   📹   [END]   💬   ⚙️    Broadcasting to 12   │
└──────────────────────────────────────────────────────┘
```

---

## Technical Changes

### File 1: `src/pages/ContenderTheater.tsx`

**Changes:**
1. Remove excessive padding/constraints from the main content wrapper
2. Pass `hasOpponent` to determine dynamic layout mode
3. Make the container truly edge-to-edge

**Current (line 191-209):**
```tsx
<div className={cn(
  "flex items-center justify-center",
  isMobile ? "fixed inset-0 flex-col pt-14 pb-24" : "pt-20 pb-32 px-4 min-h-screen"
)}>
  <BattleVideoContainer
    ...
    layout={isMobile ? 'pip' : 'split'}
    className="w-full h-full max-w-7xl"
  />
</div>
```

**New:**
```tsx
<div className={cn(
  "flex items-center justify-center",
  isMobile 
    ? "fixed inset-0 flex-col pt-12 pb-20" 
    : "fixed inset-0 pt-14 pb-24 px-2"  // Edge-to-edge
)}>
  <BattleVideoContainer
    ...
    layout={isMobile ? 'pip' : (hasOpponent ? 'split' : 'preview')}  // Dynamic layout
    className="w-full h-full"  // Remove max-w constraint
  />
</div>
```

### File 2: `src/components/streaming/BattleVideoContainer.tsx`

**Changes:**
1. Add new `'preview'` layout mode (barber 70%, waiting indicator 30%)
2. Make split layout truly 50/50 with no wasted space
3. Remove rounded corners in full-screen mode for edge-to-edge

**Add new layout type:**
```tsx
layout?: 'split' | 'pip' | 'preview';  // Add 'preview'
```

**Add preview layout implementation:**
```tsx
if (layout === 'preview') {
  // Barber gets 70% during preview, opponent waiting indicator gets 30%
  return (
    <div className={cn("relative w-full h-full bg-black overflow-hidden", className)}>
      <div className="flex h-full">
        {/* Local Video - LARGE (70%) */}
        <div className="relative w-[70%] border-r border-white/10">
          {localTrack ? (
            <VideoAttach track={localTrack} className="w-full h-full" muted />
          ) : (
            // Loading state
          )}
          {/* YOUR SIDE label */}
        </div>
        
        {/* Waiting for opponent - SMALLER (30%) */}
        <div className="relative w-[30%] bg-muted/50 flex items-center justify-center">
          <div className="text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
            <p className="text-white/60 text-sm">Waiting for</p>
            <p className="text-white/60 text-sm">opponent...</p>
          </div>
        </div>
      </div>
      
      {/* VS badge - positioned at the boundary */}
      <div className="absolute left-[70%] top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        ...VS badge...
      </div>
    </div>
  );
}
```

**Modify split layout for equal 50/50:**
```tsx
// Change flex-1 to explicit w-1/2 for guaranteed 50/50
<div className="flex h-full">
  <div className="relative w-1/2 border-r border-white/10">
    {/* Local video */}
  </div>
  <div className="relative w-1/2">
    {/* Remote video */}
  </div>
</div>
```

### File 3: `src/components/contender/ContenderTopBar.tsx`

**Changes:**
1. Reduce vertical padding for slimmer profile
2. Make it more overlay-like (less intrusive)

```tsx
// Line 32-34: Reduce padding
<div className={cn(
  "fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-2 pt-safe",  // p-3 → p-2
  ...
)}>
```

### File 4: `src/components/contender/ContenderControlBar.tsx`

**Changes:**
1. Reduce vertical padding for slimmer profile
2. Ensure controls don't take excessive space

```tsx
// Line 49-51: Reduce padding
<div className={cn(
  "fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent",
  isMobile ? "p-3 pb-safe" : "p-4",  // Reduced from p-4/p-6
  ...
)}>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ContenderTheater.tsx` | Remove padding constraints, pass dynamic layout based on `hasOpponent`, make edge-to-edge |
| `src/components/streaming/BattleVideoContainer.tsx` | Add `'preview'` layout (70/30 split), optimize `'split'` for true 50/50 |
| `src/components/contender/ContenderTopBar.tsx` | Reduce padding for slimmer profile |
| `src/components/contender/ContenderControlBar.tsx` | Reduce padding for slimmer profile |

---

## Summary

This enhancement maximizes screen real estate by:

1. **Removing wasted padding/margins** - Video fills the screen edge-to-edge
2. **Dynamic layout based on battle state**:
   - **Preview mode**: Barber sees themselves at 70%, opponent area at 30%
   - **Battle mode**: True 50/50 split when opponent connects
3. **Slimmer control bars** - Top and bottom overlays take minimal space
4. **Mobile optimization** - PIP layout remains for mobile with reduced padding

The barber will now have maximum visibility of their camera during setup, and a balanced view once the battle begins.
