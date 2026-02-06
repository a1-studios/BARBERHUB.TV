

# Arena Profile Card -- Bottom Action Bar Redesign

## What Changes

Replace the current top header rows (avatar, name, stats, vote/explore buttons) with a minimalist, translucent action bar docked at the bottom of each video container. Video expands to fill the entire card area, with the action bar floating over the bottom edge -- Reddit/TikTok-style icon-only interactions.

## Current vs New Layout

### Current (per video box)
```text
+----------------------------------+
| [Avatar] Name           [Vote]   |  <-- Header row (takes ~40px)
|          Likes | Followers        |
|                                  |
|        [Video Content]           |
|                                  |
|  [Viewer Count]                  |
+----------------------------------+
```

### New (per video box)
```text
+----------------------------------+
| [Flag] Name              [LIVE]  |  <-- Tiny top-left overlay (20% opacity)
|                                  |
|        [Video Content]           |  <-- Full-bleed, expanded ~15%
|                                  |
| [Donate] [Follow] [Profile] [Share] [Vote] |  <-- 40px glass action bar
+----------------------------------+
```

## Detailed Changes

### File: `src/components/DynamicBattleHero.tsx`

**1. Remove existing header rows (both barbers)**

For Barber 1 (lines 289-318): Remove the entire `Compact Header Row` div containing avatar circle, name, likes/followers stats, and vote/explore button.

For Barber 2 (lines 409-438): Remove the entire `Compact Header Row - Right Aligned` div.

**2. Add tiny top-left name overlay (per video box)**

Replace the removed header with a minimal overlay inside the video area:
- Absolute positioned `top-2 left-2`
- `bg-black/20 backdrop-blur-sm rounded-full px-2 py-0.5`
- Country flag emoji (tiny, from country_code) + display name
- Text: `text-[10px] text-white/80 font-medium`
- For Barber 2: mirror to `top-2 right-2` with right alignment

**3. Add translucent action bar (per video box)**

Inside each video container (the `flex-1 min-h-0 relative` div), add a new absolute-bottom bar:

```text
Position: absolute bottom-0 left-0 right-0
Height: h-10 (40px)
Background: bg-black/40 backdrop-blur-sm
Layout: flex items-center justify-between px-3
Z-index: z-10
```

**4 action icons per bar (icon-only, no text labels):**

| Position | Icon | Lucide Icon | Color | Action |
|----------|------|-------------|-------|--------|
| Left | Donate | `Heart` | `text-primary` (neon orange) with subtle glow | Opens DonationModal for that barber |
| Center-left | Follow | `UserPlus` / `UserCheck` | `text-white/70`, toggles to `text-cyan` when followed | Toggle follow via `creator_follows` table |
| Center-right | Profile | `User` | `text-white/70` | Navigate to `/barber/{user_id}` |
| Right | Share | `Share2` | `text-white/70` | Web Share API or copy link |

**Vote button integration:** When voting is available (isVotingPhase or showDemoMode), add a 5th icon on the far right:
- `Vote` icon (use `ThumbsUp` from lucide) in the appropriate color (primary for barber1, cyan for barber2)
- Same vote logic as the existing `VoteButton` component

**5. Icon styling**

All icons:
- Size: `w-5 h-5` (touch target padded to 44px via `p-2`)
- Stroke: thin (strokeWidth=1.5) for ghost/borderless look
- No borders, no backgrounds on individual icons
- Hover: `hover:text-white` transition
- Active tap: `active:scale-90` for feedback

Donate icon special treatment:
- Color: `text-primary` (neon orange) always -- primary business action
- Subtle glow: `drop-shadow-[0_0_4px_hsl(var(--primary)/0.5)]`

**6. Move viewer count overlay**

The existing viewer count overlay (Eye icon + count) moves from `bottom-2` to `top-2 right-2` to avoid collision with the new action bar.

**7. Video container expansion**

Remove the `p-2 sm:p-3` padding from the content wrapper divs (lines 288, 408) so video fills edge-to-edge. The action bar and name overlay float over the video with their own padding.

**8. Add DonationModal state**

Add state for donation modal:
```typescript
const [donationTarget, setDonationTarget] = useState<{id: string, name: string} | null>(null);
```

Import and render `DonationModal` at the bottom of the component, controlled by `donationTarget`.

**9. Add follow mutation**

Add inline follow toggle logic (mirroring `FeaturedCreatorCard` pattern):
- Query `creator_follows` to check if current user follows each barber
- Insert/delete on toggle
- Show `UserCheck` (filled) when following, `UserPlus` when not

**10. Add share handler**

```typescript
const handleShare = (barber: BarberProfile) => {
  const url = `${window.location.origin}/barber/${barber.user_id}`;
  if (navigator.share) {
    navigator.share({ title: barber.display_name, url });
  } else {
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  }
};
```

**11. Remove VoteButton inline component**

The standalone `VoteButton` component (lines 17-39) is no longer needed as voting is integrated into the action bar.

**12. Update icon imports**

Replace current imports:
```typescript
// Before
import { Heart, Users, Eye, Compass } from "lucide-react";

// After  
import { Heart, Eye, UserPlus, UserCheck, User, Share2, ThumbsUp } from "lucide-react";
```

Remove `Users` and `Compass` (no longer used).

### File: No other files modified

All changes are self-contained within `DynamicBattleHero.tsx`. The `DonationModal` and `BarberVideoSection` components are used as-is.

## Visual Result

Each video box becomes a full-bleed content area with:
- A whisper-thin name tag in the corner (barely visible, 20% opacity background)
- A slim glass action bar at the bottom with 4-5 evenly spaced ghost icons
- The donate icon glows orange to stand out as the primary business action
- Video content gains ~15% more vertical space from removing the header row

## What Stays the Same

- VS spinning ring and lightning flash animation (center)
- LIVE badge positioning (top center)
- MobileVoteCenter on mobile during active battles
- Vote progress bar at the very bottom
- Flag backgrounds behind each video box
- BarberHeroStreamControls for barbers in their own battle
- All existing query logic, rotation logic, and battle state management

