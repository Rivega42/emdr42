import { router } from './trpc';
import { authRouter } from './routers/auth.router';
import { sessionsRouter } from './routers/sessions.router';
import { usersRouter } from './routers/users.router';

export const appRouter = router({
  auth: authRouter,
  sessions: sessionsRouter,
  users: usersRouter,
});

/** Тип корневого роутера — экспортируется для фронтенда */
export type AppRouter = typeof appRouter;
