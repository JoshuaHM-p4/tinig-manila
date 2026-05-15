import { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from '../lib/socket';
import { api } from '../lib/api';

/**
 * Centralised live state for the dashboard.
 *
 * It subscribes to backend Socket.io events and exposes:
 *   - stats:        { activeCalls, resolvedToday, avgResolutionSec }
 *   - sessions:     Map<sessionId, SessionView> (active + recently ended)
 *   - transcripts:  rolling flat list of all transcript events (capped)
 *   - history:      recently ended calls (capped)
 *
 * SessionView shape:
 *   { id, channel, callerName, profile, intent, sentiment, sentimentLabel,
 *     startedAt, lastActivityAt, durationSec, status, messages: [{role, text, at}] }
 */
export function useDashboardStore() {
  const [stats, setStats] = useState({
    activeCalls: 0,
    resolvedToday: 0,
    avgResolutionSec: 0,
  });
  const [sessions, setSessions] = useState(() => new Map());
  const [transcripts, setTranscripts] = useState([]); // rolling feed
  const [history, setHistory] = useState([]); // ended calls
  const [intentCounts, setIntentCounts] = useState({}); // for analytics

  // Refs let us mutate the latest snapshot inside event handlers without stale closures.
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  // ── Helpers ─────────────────────────────────────────────────────────────
  const upsertSession = useCallback((id, patch) => {
    setSessions((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) || {
        id,
        channel: 'browser',
        callerName: 'Unknown Caller',
        profile: null,
        intent: 'general_inquiry',
        sentiment: 50,
        sentimentLabel: 'Neutral',
        startedAt: new Date(),
        lastActivityAt: new Date(),
        durationSec: 0,
        status: 'active',
        messages: [],
      };
      next.set(id, { ...existing, ...patch });
      return next;
    });
  }, []);

  // ── Initial stats fetch + listeners ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    api
      .stats()
      .then((s) => !cancelled && s && setStats(s))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handlers = {
      call_stats: (s) => setStats(s),

      call_started: ({ sessionId, channel, timestamp }) => {
        upsertSession(sessionId, {
          id: sessionId,
          channel: channel || 'browser',
          startedAt: timestamp ? new Date(timestamp) : new Date(),
          lastActivityAt: timestamp ? new Date(timestamp) : new Date(),
          status: 'active',
          messages: [],
        });
      },

      caller_profile: ({ sessionId, profile }) => {
        upsertSession(sessionId, {
          profile,
          callerName: profile?.name || 'Unknown Caller',
          lastActivityAt: new Date(),
        });
      },

      transcript: (evt) => {
        const { sessionId, channel, callerName, callerMessage, tinigReply, timestamp } = evt;
        const at = timestamp ? new Date(timestamp) : new Date();

        upsertSession(sessionId, (() => {
          const existing = sessionsRef.current.get(sessionId);
          const messages = existing?.messages ? [...existing.messages] : [];
          messages.push({ role: 'user', text: callerMessage, at });
          messages.push({ role: 'assistant', text: tinigReply, at });
          return {
            channel: channel || existing?.channel || 'browser',
            callerName: callerName || existing?.callerName || 'Unknown Caller',
            lastActivityAt: at,
            messages: messages.slice(-40),
          };
        })());

        setTranscripts((prev) =>
          [
            {
              id: `${sessionId}-${at.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
              sessionId,
              channel,
              callerName,
              callerMessage,
              tinigReply,
              at,
            },
            ...prev,
          ].slice(0, 60),
        );
      },

      analytics_update: ({ sessionId, intent, sentiment, sentimentLabel }) => {
        upsertSession(sessionId, { intent, sentiment, sentimentLabel });
        if (intent) {
          setIntentCounts((prev) => ({ ...prev, [intent]: (prev[intent] || 0) + 1 }));
        }
      },

      call_ended: ({ sessionId, channel, durationSec, callerName, resolved }) => {
        const existing = sessionsRef.current.get(sessionId);
        const endedAt = new Date();
        const ended = {
          ...(existing || {}),
          id: sessionId,
          channel: channel || existing?.channel || 'browser',
          callerName: callerName || existing?.callerName || 'Unknown Caller',
          durationSec: durationSec ?? existing?.durationSec ?? 0,
          status: resolved ? 'resolved' : 'ended',
          endedAt,
        };

        setHistory((prev) => [ended, ...prev].slice(0, 50));
        setSessions((prev) => {
          const next = new Map(prev);
          next.delete(sessionId);
          return next;
        });
      },
    };

    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn));
    return () => {
      Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn));
    };
  }, [upsertSession]);

  // Tick durations every second so active call timers update visually.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return { stats, sessions, transcripts, history, intentCounts };
}
