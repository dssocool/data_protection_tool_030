import { useCallback, useState, type CSSProperties } from "react";

const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "9.75rem 1fr",
  gap: "0.5rem 1rem",
  alignItems: "center",
  marginBottom: "0.65rem",
};

const labelStyle: CSSProperties = {
  textAlign: "right",
  fontSize: "0.9rem",
  color: "#333",
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  font: "inherit",
  fontSize: "0.9rem",
  padding: "0.4rem 0.5rem",
  border: "1px solid #ccc",
  borderRadius: 4,
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  background: "#fff",
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

function authDisablesCredentials(auth: string) {
  return auth === "entra-integrated";
}

type Props = {
  open: boolean;
  onClose: () => void;
  sessionToken: string;
};

export function SqlServerModal({ open, onClose, sessionToken }: Props) {
  const [serverName, setServerName] = useState("");
  const [authentication, setAuthentication] = useState("entra-integrated");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [encrypt, setEncrypt] = useState("mandatory");
  const [trustServerCertificate, setTrustServerCertificate] = useState(true);
  const [status, setStatus] = useState("");
  const [validating, setValidating] = useState(false);

  const credsDisabled = authDisablesCredentials(authentication);

  const handleValidate = useCallback(async () => {
    setValidating(true);
    setStatus("Validating…");
    try {
      const res = await fetch(
        `/api/session/${encodeURIComponent(sessionToken)}/connections/sql/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serverName,
            authentication,
            userName,
            password,
            databaseName,
            encrypt,
            trustServerCertificate,
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok) {
        const errMsg =
          typeof data.message === "string" && data.message.length > 0
            ? data.message
            : `Request failed (${res.status}).`;
        setStatus(errMsg);
        return;
      }
      const line =
        data.ok === true
          ? data.message && data.message.length > 0
            ? data.message
            : "Connection succeeded."
          : data.message && data.message.length > 0
            ? data.message
            : "Connection failed.";
      setStatus(line);
    } catch {
      setStatus("Network error while validating.");
    } finally {
      setValidating(false);
    }
  }, [
    sessionToken,
    serverName,
    authentication,
    userName,
    password,
    databaseName,
    encrypt,
    trustServerCertificate,
  ]);

  const handleSave = useCallback(() => {
    setStatus((s) => (s ? `${s}\n` : "") + "(Save is not implemented yet.)");
  }, []);

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
        aria-label="New SQL Server connection"
        style={modalDialogStyle}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <div style={{ padding: "1rem 1.25rem 0.5rem" }}>
            <div style={row}>
              <label htmlFor="sql-server-name" style={labelStyle}>
                Server Name:
              </label>
              <input
                id="sql-server-name"
                type="text"
                style={inputStyle}
                placeholder={String.raw`e.g. localhost\SQLEXPRESS`}
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div style={row}>
              <label htmlFor="sql-auth" style={labelStyle}>
                Authentication:
              </label>
              <select
                id="sql-auth"
                style={selectStyle}
                value={authentication}
                onChange={(e) => setAuthentication(e.target.value)}
              >
                <option value="entra-integrated">Microsoft Entra Integrated</option>
                <option value="sql">SQL Server Authentication</option>
              </select>
            </div>

            <div style={row}>
              <label htmlFor="sql-user" style={labelStyle}>
                User Name:
              </label>
              <input
                id="sql-user"
                type="text"
                style={{
                  ...inputStyle,
                  background: credsDisabled ? "#f0f0f0" : "#fff",
                  color: credsDisabled ? "#888" : "inherit",
                }}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={credsDisabled}
                autoComplete="username"
              />
            </div>

            <div style={row}>
              <label htmlFor="sql-password" style={labelStyle}>
                Password:
              </label>
              <input
                id="sql-password"
                type="password"
                style={{
                  ...inputStyle,
                  background: credsDisabled ? "#f0f0f0" : "#fff",
                  color: credsDisabled ? "#888" : "inherit",
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={credsDisabled}
                autoComplete="current-password"
              />
            </div>

            <div style={row}>
              <label htmlFor="sql-database" style={labelStyle}>
                Database Name:
              </label>
              <input
                id="sql-database"
                type="text"
                style={inputStyle}
                value={databaseName}
                onChange={(e) => setDatabaseName(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div style={row}>
              <label htmlFor="sql-encrypt" style={labelStyle}>
                Encrypt:
              </label>
              <select id="sql-encrypt" style={selectStyle} value={encrypt} onChange={(e) => setEncrypt(e.target.value)}>
                <option value="mandatory">Mandatory</option>
                <option value="optional">Optional</option>
                <option value="strict">Strict (Minimum SQL 2022 or Azure SQL)</option>
              </select>
            </div>

            <div
              style={{
                ...row,
                gridTemplateColumns: "9.75rem 1fr",
                marginBottom: "0.85rem",
              }}
            >
              <div />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  justifySelf: "start",
                }}
              >
                <input
                  type="checkbox"
                  checked={trustServerCertificate}
                  onChange={(e) => setTrustServerCertificate(e.target.checked)}
                />
                Trust Server Certificate
              </label>
            </div>

            <div style={{ marginTop: "0.35rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.4rem" }}>Status</div>
              <textarea
                readOnly
                aria-readonly="true"
                rows={8}
                value={status}
                style={{
                  ...inputStyle,
                  width: "100%",
                  minHeight: "7rem",
                  resize: "vertical",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "0.8rem",
                  background: "#fafafa",
                }}
              />
            </div>
          </div>
        </div>
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
            <button
              type="button"
              style={{
                ...modalFooterBtn,
                border: "1px solid #64748b",
                background: "#e2e8f0",
                color: "#1e293b",
              }}
              onClick={handleValidate}
              disabled={validating}
            >
              {validating ? "Validating…" : "Validate"}
            </button>
            <button
              type="button"
              style={{
                ...modalFooterBtn,
                border: "1px solid #1d4ed8",
                background: "#2563eb",
                color: "#fff",
              }}
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
