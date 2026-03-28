

## Fix: Standardize R2 Edge Functions to Use R2_ENDPOINT

### Root Cause
All 4 multipart edge functions construct the R2 endpoint from `R2_ACCOUNT_ID` (which doesn't exist as a secret), producing `https://battle-submissions.undefined.r2.cloudflarestorage.com`. The secrets page confirms `R2_ENDPOINT` is set instead.

### Changes

Update these 4 files to replace `R2_ACCOUNT_ID`-based endpoint construction with `R2_ENDPOINT`, and add upfront validation:

| File | Change |
|------|--------|
| `supabase/functions/initiate-multipart-upload/index.ts` | Use `R2_ENDPOINT`, add secret validation |
| `supabase/functions/presign-upload-part/index.ts` | Use `R2_ENDPOINT`, add secret validation |
| `supabase/functions/complete-multipart-upload/index.ts` | Use `R2_ENDPOINT`, add secret validation |
| `supabase/functions/abort-multipart-upload/index.ts` | Use `R2_ENDPOINT`, add secret validation |

### In each file, replace:
```typescript
const r2AccountId = Deno.env.get('R2_ACCOUNT_ID')!;
// ...
endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
```

### With:
```typescript
const r2Endpoint = Deno.env.get('R2_ENDPOINT');
const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');

if (!r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey) {
  return new Response(JSON.stringify({ 
    error: 'R2 credentials not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in Supabase secrets.' 
  }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
});
```

Also remove the `R2_BUCKET_NAME` fallback pattern and use `R2_BUCKET_NAME` with a default of `'battle-submissions'` (unchanged).

### Post-deploy
Redeploy all 4 functions, then test the upload flow.

