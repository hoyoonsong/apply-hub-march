import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";

type Scope =
  | { kind: "org"; id: string; slug: string; name: string }
  | { kind: "coalition"; id: string; slug: string; name: string }
  | null;

type ScopeCtx = {
  scope: Scope;
  setScope: (s: Scope) => void;
  clearScope: () => void;
};

const ScopeContext = createContext<ScopeCtx | null>(null);
const KEY = "applyhub.scope";

export const ScopeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [scope, setScopeState] = useState<Scope>(null);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        setScopeState(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const setScope = (s: Scope) => {
    setScopeState(s);
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  };
  const clearScope = () => setScope(null);

  const value = useMemo(() => ({ scope, setScope, clearScope }), [scope]);
  return (
    <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
  );
};

export const useScope = () => {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error("useScope must be used within ScopeProvider");
  return ctx;
};
