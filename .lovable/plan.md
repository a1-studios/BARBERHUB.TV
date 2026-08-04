# Connect Claude Code to the BARBER-HUB MCP server

The MCP server already exists and is deployed with 6 tools (profile, barber search, battles, open challenges, notifications read/mark-read), protected by Supabase OAuth. The remaining work is making the connection actually complete from Claude Code.

## What blocks it today

The Supabase OAuth 2.1 authorization server (and dynamic client registration) still needs to be active for this project. Until it is, Claude Code can discover the server but sign-in fails.

## Steps

1. Activate the Supabase OAuth 2.1 authorization server with dynamic client registration, so Claude Code can self-register as a client.
2. Verify the consent route at `/.lovable/oauth/consent` survives a logged-out visit: the sign-in redirect (password, signup email, and social OAuth) must return the user to the full consent URL, not to `/`. Fix any path that drops the redirect.
3. Re-deploy the `mcp` edge function and re-run the manifest extraction so the live endpoint matches the current tool list.
4. Smoke test the endpoint: confirm the protected-resource metadata and tool list respond at the published URL.
5. Add a short `docs/mcp-claude-code.md` with the connect command and troubleshooting notes.

## Connect command (for you, after step 1)

```
claude mcp add --transport http barberhub https://msuepyfssovvkjzpfjzu.supabase.co/functions/v1/mcp
```

Then run `/mcp` inside Claude Code and pick `barberhub` to authenticate. A browser window opens, you sign in to BARBER-HUB, approve on the consent screen, and the tools become available. The same URL works for Claude Desktop (Settings, Connectors, Add custom connector) and for ChatGPT/Cursor.

## Technical notes

- Endpoint: `https://msuepyfssovvkjzpfjzu.supabase.co/functions/v1/mcp`
- Auth: OAuth 2.1, issuer `https://msuepyfssovvkjzpfjzu.supabase.co/auth/v1`, audience `authenticated`
- Every tool runs as the signed-in user with RLS applied; no service-role access is added.
- No new tools are added in this pass. If you want Claude Code to also create challenges, submit videos, or move Barber Bucks, say so and I will scope write tools separately (they need the same server-side BB safeguards as the app).
