
# Center Play Buttons in Arena Video Placeholders

## Issue
Looking at the screenshot, the animated play buttons in the "🔥 ARENA INCOMING 🔥" placeholder boxes appear to be positioned lower than center. The content block (rotating play button + text) needs to be precisely centered both horizontally and vertically within each video box.

## Root Cause
In `BarberVideoSection.tsx` (lines 137-178), the placeholder content is wrapped in:
```tsx
<div className="relative text-center space-y-3">
```

The `space-y-3` creates 0.75rem gaps between the play icon and text elements, but the positioning doesn't account for this when centering. The absolute positioned radial glow div (`inset-0`) may also be affecting the layout.

## Solution
Restructure the placeholder content to use `absolute` positioning with proper centering transforms, ensuring the play button sits at the exact visual center of each box.

---

## Technical Changes

### File: `src/components/barber/BarberVideoSection.tsx`

**Lines 136-178** - Replace the arena placeholder with properly centered layout:

```tsx
// Show animated arena placeholder for non-owners (demo/simulation mode)
return (
  <div className={`${aspectClass} bg-gradient-to-br from-primary/30 via-black to-cyan/20 rounded-lg border border-primary/30 flex items-center justify-center overflow-hidden relative ${className}`}>
    {/* Radial glow - behind everything */}
    <motion.div
      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="absolute inset-0 bg-gradient-radial from-primary/30 to-transparent"
    />
    
    {/* Centered content - absolutely positioned at exact center */}
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      {/* Animated rotating barber pole effect - THE PLAY BUTTON */}
      <motion.div
        animate={{ 
          rotate: [0, 360],
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          rotate: { duration: 4, repeat: Infinity, ease: "linear" },
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
        className="w-16 h-16 relative"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-white to-cyan opacity-60" />
        <div className="absolute inset-2 rounded-full bg-black/80 flex items-center justify-center">
          <Play className="w-6 h-6 text-primary" />
        </div>
      </motion.div>
      
      {/* Pulsing text - positioned below play button */}
      <motion.div
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-center mt-3"
      >
        <p className="text-lg font-bold text-primary drop-shadow-lg">
          🔥 ARENA INCOMING 🔥
        </p>
        <p className="text-xs text-white/70">Battle starting soon...</p>
      </motion.div>
    </div>
  </div>
);
```

### Key Changes:
1. **Add `relative` to parent container** - Needed for absolute positioning of children
2. **Move radial glow to separate absolute div** - No longer interferes with content centering
3. **Use `absolute inset-0` with flexbox** - Creates a full-overlay that centers its children perfectly
4. **Remove `space-y-3`** - Replace with explicit `mt-3` margin on text block only
5. **Keep play button as first flex child** - It will be at the visual center

---

## File to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/components/barber/BarberVideoSection.tsx` | 136-178 | Restructure placeholder with absolute centering |

---

## Result
The play button (rotating circle with play icon) will be positioned at the exact center of each arena video box, with the "🔥 ARENA INCOMING 🔥" text appearing below it.
