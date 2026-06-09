import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8002';
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    socket = io(`${wsUrl}/session`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    // Снимаем все listeners ДО disconnect: повторный mount страницы сессии
    // регистрирует новый набор, и без очистки старые продолжали бы стрелять.
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
