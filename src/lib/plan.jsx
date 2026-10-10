import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { useAuth } from '../hooks/useAuth';
import { initBilling } from './billing';

// Tells the screens which plan the person is on and how much of this month they have used.
const PlanContext = createContext({ info: null, refresh: () => {}, openPaywall: () => {}, openManage: () => {}, gate: () => true });

export function PlanProvider({ children }) {
  const [info, setInfo] = useState(null);
  const [paywall, setPaywall] = useState(null);
  const [manage, setManage] = useState(false);
  const { user } = useAuth();

  const refresh = useCallback(async () => {
    try { setInfo(await api.getPlan()); } catch { /* keep the last known plan */ }
  }, []);

  // In the store app, tie the store account to this HandyCFO user.
  useEffect(() => { initBilling(user?.id).catch(() => {}); }, [user?.id]);

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
    manage,
    openManage: () => setManage(true),
    closeManage: () => setManage(false),
    closePaywall: () => setPaywall(null),
    openPaywall: (detail = {}) => setPaywall(detail),
    // For paid-only features: returns true when allowed, otherwise opens the upgrade screen.
    gate: (feature) => {
      if (!info || !info.enforced || info.paid) return true;
      setPaywall({ code: 'plan_feature', feature });
      return false;
    },
  }), [info, refresh, paywall, manage]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export const usePlan = () => useContext(PlanContext);
