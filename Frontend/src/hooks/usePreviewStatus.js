import { useEffect, useState } from 'react';
import { InvalidStatusResponse, readPreviewStatus, STATUS_POLL_MS, STATUS_TIMEOUT_MS } from '../services/status-api.js';

const INITIAL = Object.freeze({ phase: 'checking', data: null, observedAt: null });

export function usePreviewStatus() {
  const [status, setStatus] = useState(INITIAL);
  useEffect(() => {
    let active = true;
    let pollTimer;
    let timeout;
    let currentRequest;

    async function poll() {
      const request = new AbortController();
      currentRequest = request;
      timeout = setTimeout(() => request.abort(), STATUS_TIMEOUT_MS);
      try {
        const data = await readPreviewStatus(request.signal);
        if (active) setStatus({ phase: 'online', data, observedAt: Date.now() });
      } catch (error) {
        if (active) setStatus(last => ({
          ...last,
          phase: last.data ? 'stale' : error instanceof InvalidStatusResponse ? 'invalid' : 'unavailable',
        }));
      } finally {
        clearTimeout(timeout);
        currentRequest = undefined;
        if (active) pollTimer = setTimeout(poll, STATUS_POLL_MS);
      }
    }

    poll();
    return () => {
      active = false;
      clearTimeout(timeout);
      clearTimeout(pollTimer);
      currentRequest?.abort();
    };
  }, []);
  return status;
}
