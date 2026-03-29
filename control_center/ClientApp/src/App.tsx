import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { TopMenubar, type SessionPanel } from "./TopMenubar";
import { SqlServerConnectionForm } from "./SqlServerConnectionForm";

type SessionInfo = { oid: string; tid: string };

const mainStyle: CSSProperties = {
  fontFamily: "system-ui, sans-serif",
  padding: "1.5rem",
  maxWidth: "40rem",
};

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.35)",
  fontFamily: "system-ui, sans-serif",
};

const modalDialogStyle: CSSProperties = {
  minWidth: "min(90vw, 28rem)",
  minHeight: "min(70vh, 18rem)",
  background: "#fff",
  border: "1px solid #ccc",
  borderRadius: 8,
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const modalFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexShrink: 0,
  padding: "0.75rem 1rem",
  borderTop: "1px solid #ccc",
  gap: "0.75rem",
};

const modalFooterBtn: CSSProperties = {
  font: "inherit",
  fontSize: "0.9rem",
  padding: "0.45rem 0.95rem",
  borderRadius: 4,
  cursor: "pointer",
};

function CenterModal({
  open,
  onClose,
  ariaLabel,
  onSave,
  children,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  onSave?: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      role="presentation"
      style={modalOverlayStyle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={modalDialogStyle}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>{children}</div>
        <footer style={modalFooterStyle}>
          <button
            type="button"
            style={{
              ...modalFooterBtn,
              border: "1px solid #ccc",
              background: "#f5f5f5",
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            style={{
              ...modalFooterBtn,
              border: "1px solid #1d4ed8",
              background: "#2563eb",
              color: "#fff",
            }}
            onClick={() => onSave?.()}
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const session = params.get("session");

  const [state, setState] = useState<
    { kind: "idle" } | { kind: "loading" } | { kind: "ok"; data: SessionInfo } | { kind: "error"; message: string }
  >({ kind: "idle" });

  const [panel, setPanel] = useState<SessionPanel>("home");
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [sqlServerModalOpen, setSqlServerModalOpen] = useState(false);

  const closeSettingsModal = useCallback(() => setSettingsModalOpen(false), []);
  const closeSqlServerModal = useCallback(() => setSqlServerModalOpen(false), []);

  useEffect(() => {
    if (!settingsModalOpen && !sqlServerModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (settingsModalOpen) closeSettingsModal();
      else closeSqlServerModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [settingsModalOpen, sqlServerModalOpen, closeSettingsModal, closeSqlServerModal]);

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
      <TopMenubar
        onSelectPanel={setPanel}
        onOpenSettingsModal={() => setSettingsModalOpen(true)}
        onOpenSqlServerModal={() => setSqlServerModalOpen(true)}
      />
      <CenterModal open={settingsModalOpen} onClose={closeSettingsModal} ariaLabel="Settings" />
      <CenterModal
        open={sqlServerModalOpen}
        onClose={closeSqlServerModal}
        ariaLabel="New SQL Server connection"
      >
        <SqlServerConnectionForm />
      </CenterModal>
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
      </main>
    </div>
  );
}

export default App;
