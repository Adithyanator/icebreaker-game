import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function useSocket(event, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const s = getSocket();
    const wrapped = (...args) => handlerRef.current(...args);
    s.on(event, wrapped);
    return () => s.off(event, wrapped);
  }, [event]);
}

export function joinVolunteerRoom(volunteerId) {
  getSocket().emit('join:volunteer', volunteerId);
}

export function joinAdminRoom() {
  getSocket().emit('join:admin');
}
