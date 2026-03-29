import { useState, type CSSProperties } from "react";

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

function authDisablesCredentials(auth: string) {
  return auth === "entra-integrated" || auth === "windows";
}

export function SqlServerConnectionForm() {
  const [serverName, setServerName] = useState("");
  const [authentication, setAuthentication] = useState("entra-integrated");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [encrypt, setEncrypt] = useState("mandatory");
  const [trustServerCertificate, setTrustServerCertificate] = useState(true);

  const credsDisabled = authDisablesCredentials(authentication);

  return (
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
          <option value="entra-password">Microsoft Entra Password</option>
          <option value="sql">SQL Server Authentication</option>
          <option value="windows">Windows Authentication</option>
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
          <option value="strict">Strict</option>
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
          defaultValue=""
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
  );
}
