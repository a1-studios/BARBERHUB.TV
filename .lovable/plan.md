

## Enhance Prize Pool Display in Arena Ticker

### Change: `src/components/factions/ArenaTicker.tsx` (lines 186-202)

1. **Remove the Trophy icon** — Delete the rotating `<Trophy>` `motion.div` (lines 186-192)
2. **Increase BB amount font size** — Change from `text-xl sm:text-2xl lg:text-3xl` to `text-3xl sm:text-4xl lg:text-5xl` on the BB number span
3. **Keep "In Prizes" small** — Leave it at `text-xs sm:text-sm` as-is
4. **Replace manual rAF counter with framer-motion `useSpring`** — Remove the `hasAnimated` ref and `requestAnimationFrame` logic (lines 93-113). Use `useSpring(0, { stiffness: 40, damping: 20 })` + `useTransform` to smoothly animate whenever `totalPool` changes, keeping the display always in sync
5. **Add pulse glow on value change** — Wrap the BB amount in a `motion.div` with `key={totalPool}` that triggers `scale: [1, 1.08, 1]` and `filter: brightness` flash on each update
6. **Stack layout** — Change from horizontal `flex items-center gap-3` to vertical `flex flex-col items-center` so the large BB number sits above the small "In Prizes" label

### Result
```text
   93,750 BB        ← large, gradient, animated counting
    In Prizes        ← small, stays as-is
```

