import { useEffect, useRef } from 'react';

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const WORKER_URL = import.meta.env.VITE_WORKER_URL;

export function usePresence(userId) {
  const intervalRef = useRef(null);

  const sendHeartbeat = async () => {
    if (!userId) return;
    try {
      await fetch(`${WORKER_URL}/presence/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
    } catch (err) {
      console.error('Presence heartbeat failed:', err);
    }
  };

  const sendOffline = () => {
    if (!userId) return;
    // Use fetch with keepalive: true for reliable delivery on page unload
    // (sendBeacon can't handle CORS preflight for application/json content type)
    try {
      fetch(`${WORKER_URL}/presence/offline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
        keepalive: true
      });
    } catch (err) {
      console.error('Presence offline signal failed:', err);
    }
  };

  useEffect(() => {
    if (!userId) return;

    // Mark online immediately
    sendHeartbeat();

    // Repeat heartbeat every 30s
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Handle tab visibility changes
    const handleVisibility = () => {
      if (!document.hidden) sendHeartbeat();
    };

    // Handle browser/tab close — pagehide is more reliable than beforeunload on modern browsers
    window.addEventListener('pagehide', sendOffline);
    window.addEventListener('beforeunload', sendOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener('pagehide', sendOffline);
      window.removeEventListener('beforeunload', sendOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      sendOffline();
    };
  }, [userId]);
}
