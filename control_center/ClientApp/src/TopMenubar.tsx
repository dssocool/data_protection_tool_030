import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";

export type SessionPanel = "home" | "connections" | "flows";

type Props = {
  onSelectPanel: (panel: SessionPanel) => void;
  onOpenSettingsModal: () => void;
  onOpenSqlServerModal: () => void;
};

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

/** True when nested File submenus can rely on hover (fine pointer + hover capability). */
function useCanHoverSubmenus() {
  const [v, setV] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setV(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return v;
}

export function TopMenubar({ onSelectPanel, onOpenSettingsModal, onOpenSqlServerModal }: Props) {
  const canHoverSubmenus = useCanHoverSubmenus();

  const [rootOpen, setRootOpen] = useState<"file" | "view" | null>(null);
  const [fileNewOpen, setFileNewOpen] = useState(false);
  const [fileConnOpen, setFileConnOpen] = useState(false);

  const barRef = useRef<HTMLDivElement>(null);

  const closeAll = useCallback(() => {
    setRootOpen(null);
    setFileNewOpen(false);
    setFileConnOpen(false);
  }, []);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) closeAll();
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [closeAll]);

  const pick = (panel: SessionPanel) => {
    onSelectPanel(panel);
    closeAll();
  };

  const openFile = () => {
    setRootOpen("file");
    setFileNewOpen(false);
    setFileConnOpen(false);
  };

  const openView = () => {
    setRootOpen("view");
  };

  const toggleFile = () => {
    if (rootOpen === "file") closeAll();
    else openFile();
  };

  const toggleView = () => {
    if (rootOpen === "view") closeAll();
    else openView();
  };

  const leaveLi = (e: ReactMouseEvent<HTMLLIElement>, onLeave: () => void) => {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    onLeave();
  };

  return (
    <div
      ref={barRef}
      role="menubar"
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
          onClick={toggleFile}
        >
          File
        </button>
        {rootOpen === "file" && (
          <ul role="menu" aria-label="File" style={{ ...menuPanel, top: "100%", left: 0 }}>
            <li
              role="none"
              style={itemLi}
              onMouseEnter={
                canHoverSubmenus
                  ? () => {
                      setFileNewOpen(true);
                      setFileConnOpen(false);
                    }
                  : undefined
              }
              onMouseLeave={
                canHoverSubmenus
                  ? (e) =>
                      leaveLi(e, () => {
                        setFileNewOpen(false);
                        setFileConnOpen(false);
                      })
                  : undefined
              }
              onClick={
                canHoverSubmenus
                  ? undefined
                  : (ev) => {
                      ev.stopPropagation();
                      setFileNewOpen((x) => !x);
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
                    onMouseEnter={canHoverSubmenus ? () => setFileConnOpen(true) : undefined}
                    onMouseLeave={
                      canHoverSubmenus ? (e) => leaveLi(e, () => setFileConnOpen(false)) : undefined
                    }
                    onClick={
                      canHoverSubmenus
                        ? undefined
                        : (ev) => {
                            ev.stopPropagation();
                            setFileConnOpen((x) => !x);
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
                          onClick={() => {
                            onOpenSqlServerModal();
                            closeAll();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onOpenSqlServerModal();
                              closeAll();
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
          onClick={toggleView}
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

      <button
        type="button"
        role="menuitem"
        style={rootBtn}
        onClick={() => {
          onOpenSettingsModal();
          closeAll();
        }}
      >
        Settings
      </button>
    </div>
  );
}
