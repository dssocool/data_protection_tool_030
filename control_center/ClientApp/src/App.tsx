import { useEffect, useState, type CSSProperties } from "react";
import { TopMenubar, type SessionPanel } from "./TopMenubar";

type SessionInfo = { oid: string; tid: string };

const mainStyle: CSSProperties = {
  fontFamily: "system-ui, sans-serif",
  padding: "1.5rem",
  maxWidth: "40rem",
};

function App() {
  const params = new URLSearchParams(window.location.search);
  const session = params.get("session");

  const [state, setState] = useState<
    { kind: "idle" } | { kind: "loading" } | { kind: "ok"; data: SessionInfo } | { kind: "error"; message: string }
  >({ kind: "idle" });

  const [panel, setPanel] = useState<SessionPanel>("home");

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
      <main style={mainStyle}>
        <p>No session in this URL. Open the session link provided by your agent.</p>
      </main>
    );
  }

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <main style={mainStyle}>
        <p>Loading session…</p>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main style={mainStyle}>
        <p role="alert">{state.message}</p>
      </main>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopMenubar onSelectPanel={setPanel} />
      <main style={{ ...mainStyle, flex: 1 }}>
        {panel === "home" && (
          <>
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
          </>
        )}
        {panel === "connections" && (
          <>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Connections</h1>
            <p style={{ margin: 0, color: "#555" }}>No connections yet. Use File → New → Connections → SQL Server to add one.</p>
          </>
        )}
        {panel === "flows" && (
          <>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Flows</h1>
            <p style={{ margin: 0, color: "#555" }}>Flow designer is not available yet.</p>
          </>
        )}
        {panel === "settings" && (
          <>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Settings</h1>
            <p style={{ margin: 0, color: "#555" }}>Settings will appear here.</p>
          </>
        )}
        {panel === "new-sql-server" && (
          <>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>New SQL Server connection</h1>
            <p style={{ margin: 0, color: "#555" }}>Connection form is not wired yet.</p>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
