/** Socket.IO contract. Events carry IDs only; clients refetch over REST. */
export const REALTIME_PATH = '/api/socket.io';

export const REALTIME_EVENTS = {
  vehicleChanged: 'vehicle.changed',
  odometerChanged: 'odometer.changed',
  serviceChanged: 'service.changed',
  workshopChanged: 'workshop.changed',
  rulesChanged: 'rules.changed',
  notificationCreated: 'notification.created',
  garageChanged: 'garage.changed',
} as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

export type RealtimePayload = {
  garageId: string;
  vehicleId?: string;
  id?: string;
  /** Socket id that caused the change, so the origin can skip its own echo if it wants. */
  originSocketId?: string | null;
};

export function garageRoom(garageId: string): string {
  return `garage:${garageId}`;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}
