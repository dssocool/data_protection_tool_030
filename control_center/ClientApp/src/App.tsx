import { useEffect, useState } from "react";

type SessionInfo = { oid: string; tid: string };

function App() {
  const params = new URLSearchParams(window.location.search);
  const session = params.get("session");

  const [state, setState] = useState<
    { kind: "idle" } | { kind: "loading" } | { kind: "ok"; data: SessionInfo } | { kind: "error"; message: string }
  >({ kind: "idle" });

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    setState({ kind: "loading" });

    (async () => {
      try {
        const res = await fetch(`/api/session/${encodeURIComponent(session)}`);
        if (!res.ok) {
          if (!cancelled)
            setState({
              kind: "error",
              message:
                res.status === 404
                  ? "Session link expired or invalid."
                  : `Could not load session (${res.status}).`,
            });
          return;
        }
        const data = (await res.json()) as SessionInfo;
        if (!cancelled) setState({ kind: "ok", data });
      } catch {
        if (!cancelled) setState({ kind: "error", message: "Network error while loading session." });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "1.5rem", maxWidth: "40rem" }}>
        <p>No session in this URL. Open the session link provided by your agent.</p>
      </main>
    );
  }

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "1.5rem", maxWidth: "40rem" }}>
        <p>Loading session…</p>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "1.5rem", maxWidth: "40rem" }}>
        <p role="alert">{state.message}</p>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "1.5rem", maxWidth: "40rem" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Agent session</h1>
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "0.35rem 1.25rem",
          margin: 0,
        }}
      >
        <dt style={{ fontWeight: 600 }}>oid</dt>
        <dd style={{ margin: 0, wordBreak: "break-all" }}>{state.data.oid}</dd>
        <dt style={{ fontWeight: 600 }}>tid</dt>
        <dd style={{ margin: 0, wordBreak: "break-all" }}>{state.data.tid}</dd>
      </dl>
    </main>
  );
}

export default App;
