# Connect Claude to the BARBER-HUB MCP server

BARBER-HUB exposes a remote MCP server so Claude Code, Claude Desktop, ChatGPT and
Cursor can act as your signed-in BARBER-HUB user.

- Endpoint: `https://msuepyfssovvkjzpfjzu.supabase.co/functions/v1/mcp`
- Transport: Streamable HTTP
- Auth: OAuth 2.1 (Supabase), issuer `https://msuepyfssovvkjzpfjzu.supabase.co/auth/v1`

## Prerequisite (one time)

Enable the Supabase OAuth 2.1 authorization server for this project:

Supabase dashboard -> Authentication -> OAuth 2.1 server (or "OAuth Apps") ->
enable the authorization server **and** dynamic client registration.

Verify with:

```bash
curl https://msuepyfssovvkjzpfjzu.supabase.co/auth/v1/.well-known/oauth-authorization-server
```

While it is disabled this returns `{"error_code":"feature_disabled"}` and no MCP
client can complete sign-in.

Also make sure `https://barberhub.tv/.lovable/oauth/consent` is allowed under
Authentication -> URL Configuration -> Redirect URLs, so social sign-in returns
to the consent screen.

## Claude Code (CLI)

```bash
claude mcp add --transport http barberhub https://msuepyfssovvkjzpfjzu.supabase.co/functions/v1/mcp
```

Then inside Claude Code run `/mcp`, select `barberhub`, and authenticate. A browser
opens the BARBER-HUB consent screen; approve it and the tools become available.

Check status with `claude mcp list`, remove with `claude mcp remove barberhub`.

## Claude Desktop

Settings -> Connectors -> Add custom connector -> paste the endpoint URL above.
Approve on the consent screen when prompted.

## Available tools

| Tool | Purpose |
| --- | --- |
| `get_my_profile` | Signed-in user's profile, role and Barber Bucks balance |
| `search_barbers` | Barber directory search by name, specialty, city or country |
| `list_battles` | Battles by status |
| `list_open_challenges` | Open challenges awaiting an opponent |
| `list_my_notifications` | The user's notification inbox |
| `mark_notifications_read` | Mark notifications as read |

All tools are read-only except `mark_notifications_read`, and every call runs as the
authenticated user with RLS applied. No Barber Bucks can be moved over MCP.

## Troubleshooting

- **"OAuth server is disabled"** — the prerequisite above is not done yet.
- **Browser lands on `/` instead of the consent screen** — the consent return URL is
  missing from the Supabase redirect allow-list.
- **Tools missing after connecting** — redeploy the `mcp` edge function; the live
  endpoint only reflects tool changes after deployment.
- **401 on every tool call** — reconnect from the client; a copied app session token
  is not accepted, only OAuth client tokens.
