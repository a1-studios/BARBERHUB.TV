

## Particle Explosion Animation for VS/ENTER Cycle

### Concept

Replace the current simple cross-fade between "VS" and "ENTER" (Swords) with a **particle explosion effect**. Every 3 seconds when the text transitions:

1. The current text ("VS" or "ENTER") **explodes outward** into ~20 particles (tiny orange and cyan dots) that scatter in all directions
2. The particles dissipate over ~400ms
3. The new text ("ENTER" or "VS") **implodes inward** -- particles rush from the edges to the center and coalesce into the new text

This creates a dramatic energy-burst feel where the text appears to shatter and reform.

### Animation Sequence

```text
[VS visible for 5s with subtle idle glow pulse]
         |
   VS EXPLODES --> 20 particles scatter outward (400ms)
         |
   Particles converge inward --> ENTER forms (400ms)
         |
[ENTER visible for 3s with Swords icon pulse]
         |
   ENTER EXPLODES --> 20 particles scatter outward (400ms)
         |
   Particles converge inward --> VS reforms (400ms)
         |
   (repeat)
```

### Changes

#### File: `src/components/DynamicBattleHero.tsx`

**Modify the AnimatePresence transitions (lines 375-426):**

Replace the current simple opacity/scale fade with particle explosion animations:

- **Exit animation** (`exit` prop): The text scales down to 0 while spawning ~20 absolutely-positioned particle dots around it. Each particle flies outward in a random direction (random angle, random distance 20-50px) and fades to 0. Particles alternate between orange (`hsl(var(--primary))`) and cyan (`hsl(187 100% 50%)`) colors with matching glow shadows.

- **Enter animation** (`initial` + `animate`): The text starts at scale 0 with particles positioned at random outer positions. Particles animate inward to center (0,0) and fade, while the text scales from 0 to 1 with a slight overshoot (scale to 1.1 then settle to 1).

**Implementation approach -- inline particle generation:**

Rather than a separate component, generate particles directly in the motion variants using an array of `motion.div` elements rendered alongside the text inside each AnimatePresence child:

```text
<motion.div key="vs" ...>
  {/* Particle array */}
  {Array.from({ length: 20 }).map((_, i) => (
    <motion.div
      key={i}
      className="absolute w-1 h-1 rounded-full"
      style={{ backgroundColor: i % 2 === 0 ? orange : cyan }}
      initial={{ x: 0, y: 0, opacity: 1 }}
      animate={{ x: 0, y: 0, opacity: 0 }}  // idle: invisible
      exit={{
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        opacity: [1, 0],
        scale: [1, 0]
      }}
    />
  ))}
  {/* VS text */}
  <span>VS</span>
</motion.div>
```

Each particle gets a pre-calculated random angle (evenly distributed around 360 degrees) and random distance (20-50px), with a staggered delay for a natural burst feel.

**Apply to both barber and fan VS elements:**

- **Barber VS** (lines 389-406): Add particles to the VS motion.span and the Swords motion.div
- **Fan VS** (lines 411-425): For fans, since there is no cycle, add a subtle idle particle effect -- 4-6 particles that slowly orbit or float around the VS text on a loop, giving a constant "energy radiating" feel without the explosion

**Cycle timing unchanged:**
- The existing `useEffect` at lines 166-173 stays as-is (5s VS, 3s Swords for barbers)
- The explosion/implosion animation takes ~400ms for exit + ~400ms for enter, fitting within the transition window

**Rings unchanged:**
- The rotating dashed ring and inner cyan ring remain as they are (lines 344-366)

### Particle Specs

| Property | Value |
|----------|-------|
| Count per explosion | 20 particles |
| Size | 1-2px (w-1 h-1 or w-0.5 h-0.5) |
| Colors | Alternating orange (primary) and cyan |
| Scatter distance | 20-50px random per particle |
| Scatter direction | Evenly distributed angles (360/20 = 18 degree increments + slight random offset) |
| Glow | box-shadow matching particle color, 4px blur |
| Exit duration | 400ms ease-out |
| Enter duration | 400ms ease-out with overshoot |
| Stagger | 20ms between particles for natural burst feel |

### What Changes

| Element | Before | After |
|---------|--------|-------|
| VS to ENTER transition | Simple opacity/scale fade | Particle explosion outward, then implosion inward |
| ENTER to VS transition | Simple opacity/scale fade | Same particle explosion/implosion |
| Fan VS | Static with glow pulse | Static with 4-6 subtle floating particles |
| Rings | Unchanged | Unchanged |
| Drawer | Unchanged | Unchanged |
| Cycle timing | Unchanged (5s/3s) | Unchanged |

### What Is NOT Changing

- The 5s VS / 3s Swords timing cycle
- Arena Drawer contents and navigation
- Rotating ring animations
- MobileVoteCenter replacement during active battles
- Video layout, action bars, name overlays
- Open challenges badge count query

