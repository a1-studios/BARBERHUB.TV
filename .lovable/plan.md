

## Fix: BB Store Purchase Buttons Not Working

### The Problem
When you click a BB package in the store, nothing happens. The purchase never goes through because the browser is silently blocking the request due to a CORS (cross-origin) header mismatch.

The `purchase-barber-bucks` edge function only allows a few request headers, but the Supabase client now sends additional headers. The browser checks these first (called a "preflight check") and rejects the whole request when they don't match -- before the function even runs.

### The Fix
Update the CORS headers in the `purchase-barber-bucks` edge function to include all the headers the Supabase client sends. This is a one-line change.

### What Changes

**Current (broken):**
```
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
```

**Fixed:**
```
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

Also fix the OPTIONS handler -- it currently returns `null` instead of a proper `"ok"` string, which can cause issues with some browsers.

### Technical Details

#### File Modified: `supabase/functions/purchase-barber-bucks/index.ts`

1. Update `corsHeaders` object at line 6 to include the full set of allowed headers
2. Fix the OPTIONS response at line 21 from `Response(null, ...)` to `Response("ok", ...)` for consistency

No frontend changes needed -- the AddFundsModal and useBarberBucks hook are already wired correctly. Once the CORS headers are fixed, clicking a package will successfully call the edge function, which creates a Stripe checkout session and redirects the user to pay.
