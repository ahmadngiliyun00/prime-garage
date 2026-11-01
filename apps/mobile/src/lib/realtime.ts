import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { REALTIME_EVENTS, REALTIME_PATH, type RealtimePayload } from '@prime-garage/shared';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken, refreshSession } from './api';
import { API_URL } from './config';
import { qk } from './query-client';

/**
 * FR-SYNC-01/02: listens to garage events and invalidates the matching queries.
 * Events carry IDs only (ADR-005); data is always refetched over REST.
 */
export function useRealtimeSync(enabled: boolean): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const socket: Socket = io(API_URL, {
      path: REALTIME_PATH,
      transports: ['websocket'],
      auth: (cb) => cb({ token: getAccessToken() }),
      reconnectionDelayMax: 10_000,
    });

    const vehicleScoped = (p: RealtimePayload) => {
      void qc.invalidateQueries({ queryKey: qk.dashboard });
      void qc.invalidateQueries({ queryKey: qk.vehicles, exact: true });
      if (p.vehicleId) void qc.invalidateQueries({ queryKey: qk.vehicle(p.vehicleId) });
    };

    socket.on(REALTIME_EVENTS.vehicleChanged, vehicleScoped);
    socket.on(REALTIME_EVENTS.odometerChanged, vehicleScoped);
    socket.on(REALTIME_EVENTS.rulesChanged, vehicleScoped);
    socket.on(REALTIME_EVENTS.serviceChanged, (p: RealtimePayload) => {
      vehicleScoped(p);
      if (p.id) void qc.invalidateQueries({ queryKey: qk.service(p.id) });
      void qc.invalidateQueries({ queryKey: qk.workshops });
    });
    socket.on(REALTIME_EVENTS.workshopChanged, () => {
      void qc.invalidateQueries({ queryKey: qk.workshops });
    });
    socket.on(REALTIME_EVENTS.notificationCreated, () => {
      void qc.invalidateQueries({ queryKey: qk.notifications });
    });

    let first = true;
    socket.on('connect', () => {
      // FR-SYNC-02: after a reconnect, refetch everything that is on screen.
      if (!first) void qc.invalidateQueries();
      first = false;
    });
    socket.on('connect_error', (err) => {
      if (err.message === 'unauthorized') void refreshSession();
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled, qc]);
}
