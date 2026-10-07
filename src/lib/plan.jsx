import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';

// Tells the screens which plan the person is on and how much of this month they have used.
const PlanContext = createContext({ info: null, refresh: () => {}, openPaywall: () => {}, gate: () => true });

export function PlanProvider({ children }) {
  const [info, setInfo] = useState(null);
  const [paywall, setPaywall] = useState(null);

  const refresh = useCallback(async () => {
    try { setInfo(await api.getPlan()); } catch { /* keep the last known plan */ }
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    const onWall = (e) => setPaywall(e.detail || {});
    window.addEventListener('handycfo:usage-changed', onChange);
    window.addEventListener('handycfo:paywall', onWall);
    window.addEventListener('focus', onChange);
    return () => {
      window.removeEventListener('handycfo:usage-changed', onChange);
      window.removeEventListener('handycfo:paywall', onWall);
      window.removeEventListener('focus', onChange);
    };
  }, [refresh]);

  const value = useMemo(() => ({
    info,
    refresh,
    paywall,
    closePaywall: () => setPaywall(null),
    openPaywall: (detail = {}) => setPaywall(detail),
    // For paid-only features: returns true when allowed, otherwise opens the upgrade screen.
    gate: (feature) => {
      if (!info || !info.enforced || info.paid) return true;
      setPaywall({ code: 'plan_feature', feature });
      return false;
    },
  }), [info, refresh, paywall]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export const usePlan = () => useContext(PlanContext);
