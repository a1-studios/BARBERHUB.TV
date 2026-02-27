

## Make Portal Header Epic World Cup Style

### Changes to `src/pages/Portal.tsx` (lines 148-156)

Replace the plain header with a vibrant, world-cup-worthy section:

- **Increase top spacing**: Change `mb-6` to `mt-8 mb-10` on the wrapper div for more breathing room from the header
- **Title treatment**: Split "2026 Global Championship" into styled segments:
  - "2026" in white, bold
  - "GLOBAL" in primary (orange), uppercase, tracked-wide
  - "CHAMPIONSHIP" in white, uppercase
  - Use `text-3xl sm:text-5xl` for bigger impact
- **Add a fun trophy/fire emoji row** above the title: `🏆🔥⚔️🔥🏆`
- **Subtitle**: Style "Live battles every Sunday..." in orange/white mix — "Live battles" in orange, rest in white/muted
- **Add a pulsing "LIVE" dot badge** next to the subtitle for excitement
- **Wrap with a subtle gradient border card** with orange glow shadow for that world-cup stage feel

No new files needed — all inline in Portal.tsx.

