

## Fix R2 Bucket Name + Multi-Category Media Architecture

### Part 1: Immediate Fix (I do this — no action from you)

Update the default bucket name from `'battle-submissions'` to `'battles-submissions'` in all 5 edge functions:

| File | Change |
|------|--------|
| `supabase/functions/initiate-multipart-upload/index.ts` | Line 59 |
| `supabase/functions/presign-upload-part/index.ts` | Line 65 |
| `supabase/functions/complete-multipart-upload/index.ts` | Line 46 |
| `supabase/functions/abort-multipart-upload/index.ts` | Line 46 |
| `supabase/functions/get-r2-presigned-url/index.ts` | Line 12 |

Then redeploy all 5 functions. This fixes the `NoSuchBucket` error immediately.

---

### Part 2: Multi-Category R2 Upload Architecture

Your single `battles-submissions` R2 bucket will hold all content, organized by folder prefix:

```text
battles-submissions/
├── recordings/        ← Battle submission videos (existing)
│   └── {battleId}/{userId}-{timestamp}-{filename}
├── portfolios/        ← Barber social/portfolio content (NEW)
│   └── {userId}/{timestamp}-{filename}
└── education/         ← Paywalled educator content (NEW)
    └── {userId}/{timestamp}-{filename}
```

No new R2 buckets needed — just folder separation within the existing one.

#### Category 1: Battle Submissions (existing)
- Already working via multipart upload flow
- Stored under `/recordings/`

#### Category 2: Portfolio / Social Content (new)
- Barbers upload videos/images that live on their profile
- Propagated in the global feed based on engagement + optional BB boost
- Uses the same R2 bucket via `get-r2-presigned-url` with `portfolios/` prefix
- Fix `BarberVideoSection.tsx` and `BarberPublicProfile.tsx` to upload to R2 instead of Supabase Storage (which has the RLS error)

#### Category 3: Education Content (new, paywalled)
- Only barbers with Educator-tier subscription can publish
- Masterclass, Tutorial, Quick Tip categories
- Fix `EducatorUpload.tsx` to upload to R2 with `education/` prefix instead of Supabase Storage
- Paywall enforced via `creator_content.is_locked` flag + subscription check on viewer side

### What changes in code

| File | What changes |
|------|-------------|
| 5 edge functions | Bucket name `→ battles-submissions` |
| `src/lib/storage.ts` | New `uploadPortfolioToR2()` and `uploadEducationToR2()` helpers using `get-r2-presigned-url` |
| `src/components/barber/BarberVideoSection.tsx` | Small-file path switches from Supabase Storage to R2 via presigned URL |
| `src/pages/BarberPublicProfile.tsx` | Portfolio image/video uploads use R2 instead of Supabase Storage |
| `src/components/creator/EducatorUpload.tsx` | Upload goes to R2 `education/` prefix; large files use multipart |

### What you need to do

**Nothing for Part 1** — I handle the bucket name fix and redeployment.

**For Part 2**, verify:
1. Your R2 bucket `battles-submissions` has **public access** enabled (so the `R2_PUBLIC_URL` serves files). Your screenshot shows `pub-a2131dfd...r2.dev` which looks correct.
2. No CORS restrictions on the R2 bucket that would block browser PUT requests. If uploads fail with CORS errors after the fix, you'll need to add a CORS policy in Cloudflare R2 settings allowing `PUT` from your app domain.

### Technical: Feed propagation for portfolio content

Portfolio uploads will insert into `creator_content` with `promote_to_feed = true` and use the existing `build_universal_feed()` RPC. Engagement ranking uses:
- Base score: 500
- BB boost: added directly to rank_score
- Engagement signals (likes, views) can be layered later

Education content uses the same flow but with `is_locked = true` for non-subscribers, enforced client-side via subscription check.

