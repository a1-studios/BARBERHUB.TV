

# Rename Tournament Categories

## Overview

Rename two tournament categories:
- **"Speed Fade"** becomes **"Signature Style"**
- **"Gentleman's Cut"** becomes **"Classic Cut"**

## What Changes

### File: `src/config/categories.ts`

**Category 1 — Speed Fade to Signature Style (lines 23-26):**
- `name`: `'Technical Precision: The Speed Fade'` → `'Technical Precision: The Signature Style'`
- `shortName`: `'Speed Fade'` → `'Signature Style'`
- `description`: Update to reflect "signature style" instead of "speed fades"

**Category 2 — Gentleman's Cut to Classic Cut (lines 37-40):**
- `name`: `'Classic Artistry: The Gentleman\'s Cut'` → `'Classic Artistry: The Classic Cut'`
- `shortName`: `'Gentleman\'s Cut'` → `'Classic Cut'`

## What Stays the Same

- **Internal IDs** (`speed_fade`, `gentleman_cut`) remain unchanged — these are used in the database, migrations, and specialty mapping hooks, so renaming them would break data references
- **Icons, colors, vibes** — no visual changes
- **`useCategoryTopBarbers.tsx`** — the specialty-to-category mapping uses internal IDs, unaffected
- **Database records** — prize pools and tournament queue entries reference internal IDs, unaffected
- All other categories (Creative Color, Viral Styles, Beard and Scissor) remain the same

## Files Modified

| File | Change |
|------|--------|
| `src/config/categories.ts` | Update `name`, `shortName`, and `description` for two categories |

