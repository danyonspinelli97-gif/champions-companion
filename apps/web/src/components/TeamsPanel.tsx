import { useEffect, useState } from "react";
import type { TeamMember } from "@champions/team-builder";
import { useAuth } from "../lib/auth.js";
import { authConfigured } from "../lib/supabase.js";
import { listTeams, saveTeam, deleteTeam, MAX_TEAMS, type SavedTeam } from "../lib/teams.js";

export function TeamsPanel({
  members,
  onLoad,
}: {
  members: TeamMember[];
  onLoad: (m: TeamMember[]) => void;
}) {
  const { session, loading, signIn, signUp, signOut } = useAuth();

  if (!authConfigured) {
    return (
      <div className="card teams-card">
        <strong>Save teams</strong>
        <p className="muted">
          Team saving needs a Supabase project (free). Add your keys to{" "}
          <code>apps/web/.env</code> and run the SQL in the README to enable
          accounts.
        </p>
      </div>
    );
  }
  if (loading) return <div className="card teams-card muted">Checking sign-in…</div>;
  if (!session) return <LoginForm signIn={signIn} signUp={signUp} />;

  return (
    <SavedTeams
      members={members}
      onLoad={onLoad}
      email={session.user.email ?? "account"}
      onSignOut={signOut}
    />
  );
}

function LoginForm({
  signIn,
  signUp,
}: {
  signIn: (e: string, p: string) => Promise<{ error: string | null }>;
  signUp: (e: string, p: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
}) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await signIn(email.trim(), pw);
      if (error) setMsg(error);
    } else {
      const { error, needsConfirm } = await signUp(email.trim(), pw);
      if (error) setMsg(error);
      else if (needsConfirm) setMsg("Account created — check your email to confirm, then sign in.");
    }
    setBusy(false);
  };

  return (
    <div className="card teams-card">
      <strong>{mode === "in" ? "Sign in to save teams" : "Create an account"}</strong>
      <p className="muted" style={{ margin: "2px 0 8px" }}>An account is required to save teams (up to {MAX_TEAMS}).</p>
      <div className="teams-form">
        <input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <button className="primary" disabled={busy || !email || pw.length < 6} onClick={submit}>
          {busy ? "…" : mode === "in" ? "Sign in" : "Sign up"}
        </button>
      </div>
      {msg && <p className="muted" style={{ marginTop: 6 }}>{msg}</p>}
      <button className="linkish" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }}>
        {mode === "in" ? "No account? Create one" : "Have an account? Sign in"}
      </button>
    </div>
  );
}

function SavedTeams({
  members,
  onLoad,
  email,
  onSignOut,
}: {
  members: TeamMember[];
  onLoad: (m: TeamMember[]) => void;
  email: string;
  onSignOut: () => Promise<void>;
}) {
  const [teams, setTeams] = useState<SavedTeam[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => listTeams().then(setTeams).catch((e) => setErr(String(e.message ?? e)));
  useEffect(() => { refresh(); }, []);

  const atCap = teams.length >= MAX_TEAMS;
  const canSave = !busy && !atCap && name.trim().length > 0 && members.length > 0;

  const doSave = async () => {
    setBusy(true); setErr(null);
    try {
      await saveTeam(name.trim(), members);
      setName("");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };
  const doDelete = async (id: string) => {
    setBusy(true); setErr(null);
    try { await deleteTeam(id); await refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };

  return (
    <div className="card teams-card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <strong>Your teams ({teams.length}/{MAX_TEAMS})</strong>
        <span className="muted" style={{ fontSize: 12 }}>
          {email} · <button className="linkish" onClick={onSignOut}>Sign out</button>
        </span>
      </div>

      {teams.length > 0 && (
        <ul className="saved-list">
          {teams.map((t) => (
            <li key={t.id}>
              <button className="ghost" onClick={() => onLoad(structuredClone(t.data))} title="Load into builder">
                {t.name} <span className="muted">({t.data.length})</span>
              </button>
              <button className="icon-btn sm" title="Delete" onClick={() => doDelete(t.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}

      <div className="teams-form" style={{ marginTop: 8 }}>
        <input
          type="text"
          placeholder={atCap ? "Team limit reached" : "Name this team…"}
          value={name}
          disabled={atCap}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canSave && doSave()}
        />
        <button className="primary" disabled={!canSave} onClick={doSave}>Save current</button>
      </div>
      {members.length === 0 && <p className="muted" style={{ marginTop: 6 }}>Add Pokémon to the team below, then save it.</p>}
      {atCap && <p className="muted" style={{ marginTop: 6 }}>Delete a team to free a slot (max {MAX_TEAMS}).</p>}
      {err && <p style={{ color: "var(--bad)", marginTop: 6, fontSize: 13 }}>{err}</p>}
    </div>
  );
}
