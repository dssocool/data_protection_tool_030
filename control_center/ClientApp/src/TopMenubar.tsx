import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export type SessionPanel = "home" | "connections" | "flows" | "settings" | "new-sql-server";

type Props = { onSelectPanel: (panel: SessionPanel) => void };

const menuPanel: CSSProperties = {
  position: "absolute",
  background: "#fff",
  border: "1px solid #ccc",
  borderRadius: 4,
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  minWidth: 154,
  padding: "0.25rem 0",
  zIndex: 1000,
  listStyle: "none",
  margin: 0,
};

const flyout: CSSProperties = {
  ...menuPanel,
  top: 0,
  left: "100%",
  marginLeft: 2,
};

const itemLi: CSSProperties = {
  position: "relative",
  padding: "0.35rem 0.85rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontSize: "0.9rem",
};

const rootBtn: CSSProperties = {
  font: "inherit",
  padding: "0.5rem 0.75rem",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  borderRadius: 4,
};

export function TopMenubar({ onSelectPanel }: Props) {
  const [fineHover, setFineHover] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFineHover(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const [rootOpen, setRootOpen] = useState<"file" | "view" | null>(null);
  const [fileNewOpen, setFileNewOpen] = useState(false);
  const [fileConnOpen, setFileConnOpen] = useState(false);

  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const cancelClose = useCallback(() => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, []);

  const closeAll = useCallback(() => {
    setRootOpen(null);
    setFileNewOpen(false);
    setFileConnOpen(false);
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    leaveTimer.current = setTimeout(closeAll, 220);
  }, [cancelClose, closeAll]);

  useEffect(() => {
    if (fineHover) return;
    const onDocDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) closeAll();
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [fineHover, closeAll]);

  const pick = (panel: SessionPanel) => {
    onSelectPanel(panel);
    closeAll();
  };

  const openFile = () => {
    cancelClose();
    setRootOpen("file");
    setFileNewOpen(false);
    setFileConnOpen(false);
  };

  const openView = () => {
    cancelClose();
    setRootOpen("view");
  };

  const toggleFile = () => {
    cancelClose();
    if (rootOpen === "file") closeAll();
    else openFile();
  };

  const toggleView = () => {
    cancelClose();
    if (rootOpen === "view") closeAll();
    else openView();
  };

  return (
    <div
      ref={barRef}
      role="menubar"
      onMouseEnter={fineHover ? cancelClose : undefined}
      onMouseLeave={fineHover ? scheduleClose : undefined}
      style={{
        display: "flex",
        alignItems: "stretch",
        borderBottom: "1px solid #ccc",
        background: "#f5f5f5",
        fontFamily: "system-ui, sans-serif",
        userSelect: "none",
      }}
    >
      <div style={{ position: "relative" }}>
        <button
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={rootOpen === "file"}
          style={rootBtn}
          onMouseEnter={fineHover ? openFile : undefined}
          onClick={fineHover ? undefined : toggleFile}
        >
          File
        </button>
        {rootOpen === "file" && (
          <ul role="menu" aria-label="File" style={{ ...menuPanel, top: "100%", left: 0 }}>
            <li
              role="none"
              style={itemLi}
              onMouseEnter={
                fineHover
                  ? () => {
                      setFileNewOpen(true);
                      setFileConnOpen(false);
                    }
                  : undefined
              }
              onClick={
                fineHover
                  ? undefined
                  : (e) => {
                      e.stopPropagation();
                      setFileNewOpen((v) => !v);
                      setFileConnOpen(false);
                    }
              }
            >
              New
              {fileNewOpen && (
                <ul role="menu" style={flyout}>
                  <li
                    role="none"
                    style={itemLi}
                    onMouseEnter={fineHover ? () => setFileConnOpen(true) : undefined}
                    onClick={
                      fineHover
                        ? undefined
                        : (e) => {
                            e.stopPropagation();
                            setFileConnOpen((v) => !v);
                          }
                    }
                  >
                    Connections
                    {fileConnOpen && (
                      <ul role="menu" style={flyout}>
                        <li
                          role="menuitem"
                          style={itemLi}
                          tabIndex={0}
                          onClick={() => pick("new-sql-server")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              pick("new-sql-server");
                            }
                          }}
                        >
                          SQL Server
                        </li>
                      </ul>
                    )}
                  </li>
                </ul>
              )}
            </li>
          </ul>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <button
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={rootOpen === "view"}
          style={rootBtn}
          onMouseEnter={fineHover ? openView : undefined}
          onClick={fineHover ? undefined : toggleView}
        >
          View
        </button>
        {rootOpen === "view" && (
          <ul role="menu" aria-label="View" style={{ ...menuPanel, top: "100%", left: 0 }}>
            <li
              role="menuitem"
              style={itemLi}
              tabIndex={0}
              onClick={() => pick("connections")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pick("connections");
                }
              }}
            >
              Connections
            </li>
            <li
              role="menuitem"
              style={itemLi}
              tabIndex={0}
              onClick={() => pick("flows")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pick("flows");
                }
              }}
            >
              Flows
            </li>
          </ul>
        )}
      </div>

      <button type="button" role="menuitem" style={rootBtn} onClick={() => pick("settings")}>
        Settings
      </button>
    </div>
  );
}
