

# ArenaTicker: Scratch-Off Reveal with Colorful Animated Ads

## Overview

Transform the ArenaTicker from a bordered box into a borderless, dramatic "scratch-off reveal" experience. Each slide transition simulates the thrill of scratching a lottery ticket -- content starts hidden behind a shimmering overlay that wipes away to reveal the message underneath. All ad content becomes vibrant with individually animated colorful letters, a glowing "SPONSORED" badge, and placeholder messages for future confirmed sponsors.

## What Changes

### 1. Remove the Box Container

Strip away the bordered container and replace with a transparent, borderless area. The elements inside float freely with no visible box.

| Property | Current | New |
|----------|---------|-----|
| Background | `bg-black/40 backdrop-blur-sm` | `bg-transparent` (no background) |
| Border | `border border-cyan/20 rounded-lg` | Removed entirely |
| Overflow | `overflow-hidden` | Kept for animation clipping only |

The ticker becomes invisible as a "container" -- only the animated content, dots, and progress bar remain visible, creating a floating, magical feel.

### 2. Scratch-Off Reveal Animation

Each slide transition uses a two-layer reveal effect:

**Layer 1 -- The "scratch" overlay**: A shimmering metallic gradient bar (`bg-gradient-to-r from-gray-400 via-white/80 to-gray-500`) that covers the full content area. When a new slide enters, this overlay sweeps from left to right using `clipPath` animation, progressively revealing the content underneath.

**Layer 2 -- The content**: The actual message starts with `opacity: 0` and `filter: blur(8px)`, then transitions to `opacity: 1` and `filter: blur(0)` as the scratch overlay passes over it, creating that "uncovering" feel.

The sequence for each slide transition:
1. Metallic overlay appears (0ms)
2. Overlay sweeps right via animated `clipPath: inset(0 100% 0 0)` to `inset(0 0% 0 0)` then continues to `inset(0 0 0 100%)` (0-800ms)
3. Content beneath deblurs and fades in with a slight upward motion (200-600ms, overlapping with the sweep)
4. Sparkle particles burst from the reveal point (400ms)

This is built using Framer Motion's `clipPath` animation on a pseudo-overlay `motion.div` layered above the content.

### 3. Colorful Animated Letters for Sponsor Ads

Instead of rendering sponsor messages as a single `<span>`, each character is split into individual `motion.span` elements with:

- **Staggered entrance**: Each letter animates in with a 30ms delay (`staggerChildren: 0.03`)
- **Color cycling**: Letters use a rotating set of vibrant colors (cyan, orange, magenta, lime, gold) assigned based on character index: `colors[i % colors.length]`
- **Micro-animation**: Each letter has a subtle `y: [-2, 2, 0]` bounce loop at different speeds, creating a lively "dancing text" effect
- **Text shadow glow**: Each letter gets a matching color glow: `textShadow: 0 0 8px {color}`

The sponsor name portion of each message is rendered in **extra bold** with a brighter glow, while the tagline portion uses slightly dimmer colors.

### 4. Glowing "SPONSORED" Badge

The "Sponsored" label transforms from a muted pill into a highlighted, attention-grabbing element:

- Background: `bg-gradient-to-r from-primary/30 via-cyan/20 to-primary/30` with an animated shimmer sweep
- Text: `text-primary font-black uppercase tracking-[0.2em]` in orange
- Border: `border border-primary/40` with a pulsing glow shadow
- Animation: A continuous shimmer effect using `backgroundPosition` animation (a bright highlight sweeps across the badge every 2 seconds)

### 5. Placeholder Ad Content

Replace the current specific brand messages with clearly marked placeholders:

| Slot | Current | New |
|------|---------|-----|
| Slot 1 | "Powered by Wahl Pro..." | "YOUR BRAND HERE -- Premium Sponsor Slot" |
| Slot 2 | "Andis -- Precision Tools..." | "SPONSOR SPOTLIGHT -- Be the Face of the Arena" |
| Slot 3 | "BabylissPRO -- Power Behind..." | "FEATURED PARTNER -- Reach Thousands of Barbers" |
| Slot 4 | "Barber Strong -- Built for..." | "AD SPACE AVAILABLE -- Join the Movement" |

Each placeholder uses a `Sparkles` icon (from lucide-react) instead of `Megaphone` to signal "something exciting coming."

### 6. Prize Pool Slide Enhancement

The prize pool anchor slide gets a matching scratch-off reveal but with a golden/orange color scheme instead of the metallic silver. The trophy icon gets a brief spin animation on reveal, and the dollar amount "types out" digit by digit after the scratch clears (combining the existing roll-up counter with a typewriter stagger).

### 7. Progress Bar Redesign

Replace the thin top progress bar with a subtle bottom shimmer line -- a thin gradient line that fills from left to right at the bottom of the content area, using animated `scaleX`. This avoids visual conflict with the scratch overlay at the top.

- Position: Bottom of content area (not absolute top)
- Height: `h-0.5` (thinner, more elegant)
- Color: `from-cyan/40 via-primary/60 to-cyan/40`

## Technical Implementation

### File: `src/components/factions/ArenaTicker.tsx`

**Imports**: Add `Sparkles` from lucide-react. No new external dependencies.

**Scratch overlay component**: Create a `ScratchReveal` wrapper component inline that:
- Renders an absolute-positioned `motion.div` with metallic gradient background
- Animates `clipPath` from `inset(0 0 0 0)` to `inset(0 0 0 100%)` over 800ms
- Is keyed to `activeIndex` so it re-triggers on every slide change

**Letter splitting**: Create a `ColorfulText` inline component that:
- Takes a `text` string prop and optional `highlightWord` prop
- Splits text into characters, wrapping each in a `motion.span`
- Applies staggered entrance and color cycling
- Renders the `highlightWord` portion in bolder, brighter styling

**Container**: Remove `bg-black/40 backdrop-blur-sm border border-cyan/20 rounded-lg`. Replace with `relative overflow-hidden cursor-pointer select-none mb-3`.

**Sponsors array update**: Change messages to placeholder content, change icon from `Megaphone` to `Sparkles`.

**Dot indicators**: Keep existing dots but move them slightly closer to content (reduce `pb-2` to `pb-1`).

## Files to Modify

| File | Change |
|------|--------|
| `src/components/factions/ArenaTicker.tsx` | Full rework: scratch-off reveal animation, colorful letter splitting, glowing sponsored badge, placeholder ad content, borderless container, bottom progress bar |

No changes to other files. No new files. No database changes. No new dependencies (uses existing Framer Motion + Lucide).

