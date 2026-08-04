import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck } from "lucide-react";
import { AUTH_REDIRECT_BASE } from "@/lib/authRedirects";

/**
 * Social sign-in must return the user to THIS exact consent URL, otherwise the
 * provider round-trip drops them on `/` and the agent connection silently fails.
 */
function consentReturnUrl(): string {
  const path = window.location.pathname + window.location.search;
  return `${AUTH_REDIRECT_BASE}${path}`;
}

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

function oauthApi(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";

  const [needsAuth, setNeedsAuth] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Inline sign-in (keeps the user on this exact consent URL)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  async function loadDetails() {
    setError(null);
    if (!authorizationId) {
      setError("Missing authorization_id in the request URL.");
      return;
    }
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setNeedsAuth(true);
      return;
    }
    setNeedsAuth(false);
    const { data, error: detailsError } = await oauthApi().getAuthorizationDetails(
      authorizationId,
    );
    if (detailsError) {
      setError(detailsError.message);
      return;
    }
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
      return;
    }
    setDetails(data);
  }

  useEffect(() => {
    void loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorizationId]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAuthError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signInError) {
      setAuthError(signInError.message);
      return;
    }
    setPassword("");
    await loadDetails();
  }

  async function decide(approve: boolean) {
    setBusy(true);
    const api = oauthApi();
    const { data, error: decideError } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (decideError) {
      setBusy(false);
      setError(decideError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect was returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "this application";

  return (
    <main className="min-h-svh flex items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-5 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">
            Agent access
          </span>
        </div>

        {error && (
          <div className="space-y-4">
            <h1 className="text-lg font-bold text-foreground">
              Could not load this request
            </h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="w-full" onClick={() => void loadDetails()}>
              Try again
            </Button>
          </div>
        )}

        {!error && needsAuth && (
          <form className="space-y-4" onSubmit={signIn}>
            <h1 className="text-lg font-bold text-foreground">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground">
              Log in to your BARBER-HUB account to review this connection request.
            </p>
            <Input
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {authError && <p className="text-sm text-destructive">{authError}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
            <div className="pt-1 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
              or continue with
            </div>
            <div className="flex gap-2">
              {(["google", "apple", "facebook"] as const).map((provider) => (
                <Button
                  key={provider}
                  type="button"
                  variant="outline"
                  className="flex-1 capitalize"
                  disabled={busy}
                  onClick={() =>
                    void supabase.auth.signInWithOAuth({
                      provider,
                      options: { redirectTo: consentReturnUrl() },
                    })
                  }
                >
                  {provider}
                </Button>
              ))}
            </div>
          </form>

        )}

        {!error && !needsAuth && !details && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading request…
          </div>
        )}

        {!error && !needsAuth && details && (
          <div className="space-y-5">
            <h1 className="text-xl font-bold text-foreground leading-snug">
              Connect {clientName} to your account
            </h1>
            <p className="text-sm text-muted-foreground">
              {clientName} will be able to read your BARBER-HUB profile, Barber Bucks
              balance, battles, challenges and notifications, and mark notifications as
              read — acting as you. You can revoke access at any time.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => void decide(false)}
              >
                Deny
              </Button>
              <Button className="flex-1" disabled={busy} onClick={() => void decide(true)}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
