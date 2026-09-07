// useAutoRefresh — keeps a view's data fresh so Web <-> Mobile changes appear
// automatically. The whole CRM (web + mobile, all roles) shares ONE backend and
// one MongoDB database (salescrm), so refetching is what makes the two platforms
// stay in sync. Pass the view's own loader: it is called on a short interval,
// when the browser tab regains focus, and when the page becomes visible again.
// A ref holds the latest loader, so the interval is created once and never breaks
// if the loader's identity changes between renders.
import { useEffect, useRef } from 'react';

export default function useAutoRefresh(load, intervalMs = 20000) {
  const ref = useRef(load);
  useEffect(() => { ref.current = load; });
  useEffect(() => {
    const tick = () => { try { if (ref.current) ref.current(); } catch (e) { /* ignore */ } };
    const timer = setInterval(tick, intervalMs);
    const onFocus = () => tick();
    const onVis = () => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') tick(); };
    if (typeof window !== 'undefined') window.addEventListener('focus', onFocus);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
    };
  }, [intervalMs]);
}
