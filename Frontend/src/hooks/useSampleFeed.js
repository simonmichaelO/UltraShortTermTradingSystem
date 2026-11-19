import { useEffect, useRef, useState } from 'react';
import {
  acceptSample, emptySampleFeed, expireSample, failSample, InvalidSampleResponse, readSampleSnapshot,
  SAMPLE_POLL_MS, SAMPLE_TIMEOUT_MS, SCENARIOS,
} from '../services/sample-api.js';

export function useSampleFeed() {
  const [scenario, setScenario] = useState('normal');
  const [visible, setVisible] = useState(() => ({ ...emptySampleFeed(), scenario: 'normal', refreshing: true }));
  const refresh = useRef(null);

  useEffect(() => {
    let active = true;
    let state = emptySampleFeed();
    let request;
    let deadline;
    let nextPoll;
    let ageTimer;

    function publish() {
      if (!active) return;
      state = expireSample(state, performance.now());
      setVisible({ ...state, scenario, refreshing: !!request });
      clearTimeout(ageTimer);
      if (state.phase === 'fresh') {
        ageTimer = setTimeout(publish, Math.max(1, Math.ceil(state.expiresAt - performance.now())));
      }
    }

    async function poll() {
      if (!active || request) return;
      clearTimeout(nextPoll);
      const started = performance.now();
      request = new AbortController();
      deadline = setTimeout(() => request?.abort(), SAMPLE_TIMEOUT_MS);
      publish();
      try {
        const snapshot = await readSampleSnapshot(scenario, request.signal);
        const received = performance.now();
        state = acceptSample(state, snapshot, received, received - started);
      } catch (error) {
        state = failSample(state, error instanceof InvalidSampleResponse ? 'invalid' : 'network');
      } finally {
        clearTimeout(deadline);
        request = undefined;
        if (active) {
          publish();
          nextPoll = setTimeout(poll, SAMPLE_POLL_MS);
        }
      }
    }

    function resume() {
      if (document.visibilityState !== 'visible') return;
      publish();
      // Recheck the transport when the tab resumes. Do not overlap requests.
      if (state.phase !== 'fresh') void poll();
    }

    refresh.current = poll;
    void poll();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    return () => {
      active = false;
      clearTimeout(deadline);
      clearTimeout(nextPoll);
      clearTimeout(ageTimer);
      request?.abort();
      refresh.current = null;
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
    };
  }, [scenario]);

  const current = visible.scenario === scenario ? visible : { ...emptySampleFeed(), scenario, refreshing: true };
  return {
    ...current,
    checkNow: () => refresh.current?.(),
    setScenario: value => {
      if (value === scenario || !SCENARIOS.includes(value)) return;
      setVisible({ ...emptySampleFeed(), scenario: value, refreshing: true });
      setScenario(value);
    },
  };
}
