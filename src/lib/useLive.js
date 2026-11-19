import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, getToken, TENANT } from './api.js';

/**
 * Conecta ao tempo real da operadora (somente escuta).
 * handlers: { 'live:ride': fn, 'live:driver-location': fn, 'live:driver-status': fn, 'credit:informed': fn }
 */
export function useLive(handlers) {
  const [connected, setConnected] = useState(false);
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const socket = io(API_URL, { auth: { token: getToken(), tenant: TENANT }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    for (const event of ['live:ride', 'live:driver-location', 'live:driver-status', 'credit:informed']) {
      socket.on(event, (payload) => ref.current?.[event]?.(payload));
    }
    return () => socket.close();
  }, []);

  return connected;
}
