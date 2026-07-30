"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { LegacyApp } from "./legacy-app";

type PublicAuthConfig = {
  mode: "supabase" | "private_preview";
  email: boolean;
  emailVerification: boolean;
  totpMfa: boolean;
  google: boolean;
  apple: boolean;
  instagramIdentity: false;
  instagramConnection: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
};

type AccessUser = {
  email: string;
  displayName: string;
  role: "owner" | "client";
  clientId: string | null;
  mfaRequired: boolean;
};

const delay = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function Monogram() {
  return (
    <div className="access-monogram" aria-label="Legacy OS">
      <span>L</span>
      <i>L</i>
    </div>
  );
}

async function json<T>(response: Response) {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Unable to continue");
  return payload;
}

export function AccessShell({ ownerName }: { ownerName: string }) {
  const [stage, setStage] = useState<
    "splash" | "login" | "mfa_enroll" | "mfa_challenge" | "app"
  >("splash");
  const [config, setConfig] = useState<PublicAuthConfig | null>(null);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<AccessUser | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [roleIntent, setRoleIntent] = useState<"owner" | "client">("owner");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [invitationToken, setInvitationToken] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      let resumedSession = false;
      await delay(1350);
      try {
        const nextConfig = await json<PublicAuthConfig>(
          await fetch("/api/auth/config"),
        );
        if (!active) return;
        setConfig(nextConfig);
        const portalInvitation =
          new URLSearchParams(window.location.search).get("portal")?.trim() ||
          "";
        if (portalInvitation) {
          setRoleIntent("client");
          setInvitationToken(portalInvitation);
          sessionStorage.setItem(
            "legacy_client_invitation",
            portalInvitation,
          );
        }
        if (
          nextConfig.mode === "private_preview" &&
          portalInvitation
        ) {
          setUser({
            email: "",
            displayName: "Client",
            role: "client",
            clientId: null,
            mfaRequired: false,
          });
          setStage("app");
          resumedSession = true;
        }
        if (
          nextConfig.mode === "supabase" &&
          nextConfig.supabaseUrl &&
          nextConfig.supabaseAnonKey
        ) {
          const nextClient = createClient(
            nextConfig.supabaseUrl,
            nextConfig.supabaseAnonKey,
          );
          setClient(nextClient);
          const {
            data: { session },
          } = await nextClient.auth.getSession();
          if (session) {
            localStorage.setItem("legacy_access_token", session.access_token);
            await bootstrap(
              nextClient,
              portalInvitation ||
                sessionStorage.getItem("legacy_client_invitation") ||
                "",
            );
            resumedSession = true;
          }
        }
      } catch (loadError) {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load access settings",
          );
      } finally {
        if (active && !resumedSession) setStage("login");
      }
    })();
    return () => {
      active = false;
    };
    // The bootstrap routine intentionally runs only for the restored session
    // discovered during this single initialization pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const providerReady = config?.mode === "supabase";
  const roleLabel =
    roleIntent === "owner" ? "Owner / Operations" : "Client portal";

  async function bootstrap(
    authClient: SupabaseClient,
    invite = invitationToken,
  ) {
    const {
      data: { session },
    } = await authClient.auth.getSession();
    if (!session) throw new Error("Your session has expired");
    localStorage.setItem("legacy_access_token", session.access_token);
    const payload = await json<{ user: AccessUser }>(
      await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ invitationToken: invite || undefined }),
      }),
    );
    sessionStorage.removeItem("legacy_client_invitation");
    setUser(payload.user);

    if (payload.user.mfaRequired) {
      const assurance =
        await authClient.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.data?.currentLevel === "aal2") {
        setStage("app");
        return;
      }
      const factors = await authClient.auth.mfa.listFactors();
      const verified = factors.data?.totp.find(
        (factor) => factor.status === "verified",
      );
      if (verified) {
        const challenge = await authClient.auth.mfa.challenge({
          factorId: verified.id,
        });
        if (challenge.error) throw challenge.error;
        setFactorId(verified.id);
        setChallengeId(challenge.data.id);
        setStage("mfa_challenge");
        return;
      }
      const enrollment = await authClient.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Legacy OS",
      });
      if (enrollment.error) throw enrollment.error;
      setFactorId(enrollment.data.id);
      setQrCode(enrollment.data.totp.qr_code);
      setStage("mfa_enroll");
      return;
    }
    setStage("app");
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    try {
      if (authMode === "signup") {
        if (roleIntent === "client" && invitationToken) {
          sessionStorage.setItem(
            "legacy_client_invitation",
            invitationToken,
          );
        }
        const result = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (result.error) throw result.error;
        if (!result.data.session) {
          setNotice(
            "Check your email to verify this account, then return to sign in.",
          );
          setAuthMode("signin");
          return;
        }
      } else {
        const result = await client.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
      }
      await bootstrap(client);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to sign in",
      );
    } finally {
      setBusy(false);
    }
  }

  async function provider(providerName: "google" | "apple") {
    if (!client) return;
    setError("");
    if (roleIntent === "client") {
      if (!invitationToken.trim()) {
        setError(
          "Client social sign-in requires the invitation code from the studio.",
        );
        return;
      }
      sessionStorage.setItem(
        "legacy_client_invitation",
        invitationToken.trim(),
      );
    }
    const result = await client.auth.signInWithOAuth({
      provider: providerName,
      options: { redirectTo: window.location.origin },
    });
    if (result.error) setError(result.error.message);
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !factorId) return;
    setBusy(true);
    setError("");
    const code = String(new FormData(event.currentTarget).get("code") || "");
    try {
      let nextChallengeId = challengeId;
      if (!nextChallengeId) {
        const challenge = await client.auth.mfa.challenge({ factorId });
        if (challenge.error) throw challenge.error;
        nextChallengeId = challenge.data.id;
      }
      const verified = await client.auth.mfa.verify({
        factorId,
        challengeId: nextChallengeId,
        code,
      });
      if (verified.error) throw verified.error;
      if (verified.data.access_token) {
        localStorage.setItem(
          "legacy_access_token",
          verified.data.access_token,
        );
      }
      setStage("app");
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "That verification code was not accepted",
      );
    } finally {
      setBusy(false);
    }
  }

  function enterPrivatePreview(role: "owner" | "client") {
    setRoleIntent(role);
    setUser({
      email: "",
      displayName: role === "owner" ? ownerName : "Client",
      role,
      clientId: null,
      mfaRequired: false,
    });
    setStage("app");
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      if (client) {
        const result = await client.auth.signOut();
        if (result.error) throw result.error;
      }
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "Unable to end this session",
      );
    } finally {
      localStorage.removeItem("legacy_access_token");
      sessionStorage.removeItem("legacy_client_invitation");
      setUser(null);
      setFactorId("");
      setChallengeId("");
      setQrCode("");
      setInvitationToken("");
      setPasswordVisible(false);
      setStage("login");
      setBusy(false);
    }
  }

  if (stage === "splash") {
    return (
      <main className="legacy-splash">
        <div className="splash-halo" />
        <Monogram />
        <h1>LEGACY OS</h1>
        <p>THE AI OPERATING SYSTEM FOR CREATIVE PROFESSIONALS</p>
        <span>ORGANIZE · CREATE · AUTOMATE · REMEMBER · GROW</span>
      </main>
    );
  }

  if (stage === "app" && user) {
    return (
      <LegacyApp
        firstName={user.displayName.split(" ")[0] || ownerName}
        initialMode={user.role === "client" ? "portal" : "owner"}
        authenticatedClient={user.role === "client" && Boolean(providerReady)}
        onSignOut={() => void signOut()}
      />
    );
  }

  if (stage === "mfa_enroll" || stage === "mfa_challenge") {
    return (
      <main className="access-page">
        <section className="access-card compact-access-card">
          <Monogram />
          <p className="eyebrow gold">TWO-STEP VERIFICATION</p>
          <h1>
            {stage === "mfa_enroll"
              ? "Protect this account."
              : "Confirm it’s you."}
          </h1>
          <p>
            {stage === "mfa_enroll"
              ? "Scan the code with an authenticator app, then enter the six-digit code."
              : "Enter the six-digit code from your authenticator app."}
          </p>
          {qrCode && (
            <div className="totp-qr">
              {/* The authenticator service returns a short-lived data URI. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="Legacy OS authenticator QR code" />
            </div>
          )}
          <form onSubmit={verifyMfa}>
            <label className="access-field">
              <span>Verification code</span>
              <div>
                <KeyRound size={17} />
                <input
                  name="code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  required
                />
              </div>
            </label>
            {error && <p className="access-error">{error}</p>}
            <button className="gold-button wide" disabled={busy}>
              <ShieldCheck size={16} />
              {busy ? "Verifying…" : "Verify and continue"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="access-page">
      <section className="access-card">
        <header className="access-brand">
          <Monogram />
          <div>
            <strong>LEGACY OS</strong>
            <span>PRIVATE STUDIO ACCESS</span>
          </div>
        </header>
        <div className="access-intro">
          <p className="eyebrow gold">WELCOME BACK</p>
          <h1>Enter your legacy.</h1>
          <p>
            Secure owner operations and private client projects use separate,
            server-enforced roles.
          </p>
        </div>
        <div className="role-switch" aria-label="Account type">
          <button
            className={roleIntent === "owner" ? "active" : ""}
            onClick={() => setRoleIntent("owner")}
          >
            <ShieldCheck size={15} /> Owner
          </button>
          <button
            className={roleIntent === "client" ? "active" : ""}
            onClick={() => setRoleIntent("client")}
          >
            <UserRound size={15} /> Client
          </button>
        </div>

        {providerReady ? (
          <>
            <div className="auth-mode-switch">
              <button
                className={authMode === "signin" ? "active" : ""}
                onClick={() => setAuthMode("signin")}
              >
                Sign in
              </button>
              <button
                className={authMode === "signup" ? "active" : ""}
                onClick={() => setAuthMode("signup")}
              >
                Create account
              </button>
            </div>
            <form className="access-form" onSubmit={submitEmail}>
              <label className="access-field">
                <span>Email</span>
                <div>
                  <UserRound size={17} />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>
              <label className="access-field">
                <span>Password</span>
                <div>
                  <LockKeyhole size={17} />
                  <input
                    type={passwordVisible ? "text" : "password"}
                    name="password"
                    autoComplete={
                      authMode === "signup"
                        ? "new-password"
                        : "current-password"
                    }
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible((value) => !value)}
                    aria-label={
                      passwordVisible ? "Hide password" : "Show password"
                    }
                  >
                    {passwordVisible ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </label>
              {roleIntent === "client" && authMode === "signup" && (
                <label className="access-field">
                  <span>Studio invitation code</span>
                  <div>
                    <KeyRound size={17} />
                    <input
                      value={invitationToken}
                      onChange={(event) =>
                        setInvitationToken(event.target.value)
                      }
                      required
                    />
                  </div>
                </label>
              )}
              {notice && (
                <p className="access-notice">
                  <CheckCircle2 size={15} /> {notice}
                </p>
              )}
              {error && <p className="access-error">{error}</p>}
              <button className="gold-button wide" disabled={busy}>
                {busy
                  ? "Securing access…"
                  : `${authMode === "signup" ? "Create" : "Open"} ${roleLabel}`}
                <ArrowRight size={16} />
              </button>
            </form>
            <div className="auth-divider">
              <span>OR CONTINUE WITH</span>
            </div>
            {roleIntent === "client" && (
              <label className="access-field provider-invitation">
                <span>Studio invitation code for Google or Apple</span>
                <div>
                  <KeyRound size={17} />
                  <input
                    value={invitationToken}
                    onChange={(event) =>
                      setInvitationToken(event.target.value)
                    }
                  />
                </div>
              </label>
            )}
            <div className="provider-row">
              <button onClick={() => void provider("google")}>Google</button>
              <button onClick={() => void provider("apple")}>Apple</button>
              <button
                title="Instagram is a consented data connection, not an identity provider"
                onClick={() =>
                  setNotice(
                    "Instagram connects inside the client portal after verified sign-in so consent and project access stay separate.",
                  )
                }
              >
                Instagram
              </button>
            </div>
          </>
        ) : (
          <div className="private-preview">
            <div>
              <ShieldCheck size={19} />
              <p>
                <strong>Private deployment protected</strong>
                <span>
                  Email verification, TOTP, Google, and Apple activate when
                  Supabase credentials are connected.
                </span>
              </p>
            </div>
            {error && <p className="access-error">{error}</p>}
            <button
              className="gold-button wide"
              onClick={() => enterPrivatePreview(roleIntent)}
            >
              {roleIntent === "owner"
                ? "Enter private owner workspace"
                : "Open client access"}
              <ArrowRight size={16} />
            </button>
          </div>
        )}
        <footer>
          <ShieldCheck size={14} /> Verified identity · Two-step protection ·
          Role isolation
        </footer>
      </section>
      <aside className="access-art">
        <div className="guardian-silhouette">
          <span />
        </div>
        <blockquote>
          “Build your legacy.
          <br />
          The system handles the rest.”
        </blockquote>
        <ul>
          <li>KNOWLEDGE</li>
          <li>MEMORY</li>
          <li>WORKFLOWS</li>
          <li>REASONING</li>
        </ul>
      </aside>
    </main>
  );
}
