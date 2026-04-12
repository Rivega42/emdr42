import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../services/api/src/trpc';

/** Типизированный tRPC-клиент для React */
export const trpc = createTRPCReact<AppRouter>();

/** Создание tRPC-клиента с настройками подключения */
export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/trpc`,
        headers() {
          const token = typeof window !== 'undefined'
            ? localStorage.getItem('access_token')
            : null;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
