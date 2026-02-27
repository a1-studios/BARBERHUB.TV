

## Fan VS Button: Navigate Directly to /watch

### Change

**`src/components/DynamicBattleHero.tsx`** — Line 547

Change the fan VS button's `onClick` from `setArenaDrawerOpen(true)` to `navigate('/watch')`.

That's it. The Arena popup remains for barbers (line 459 unchanged). Fans bypass it entirely and go straight to the Watch feed.

