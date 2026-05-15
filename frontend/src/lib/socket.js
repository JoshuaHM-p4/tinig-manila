import { io } from 'socket.io-client';

// Single shared socket instance. The Vite dev proxy forwards /socket.io to :3000.
// In production (when served by Express), same-origin connection just works.
export const socket = io({
  autoConnect: true,
  transports: ['websocket', 'polling'],
});
