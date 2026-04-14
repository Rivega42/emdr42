import { initTRPC, TRPCError } from '@trpc/server';
import type { Request } from 'express';
import type { AuthService } from '../auth/auth.service';
import type { SessionsService } from '../sessions/sessions.service';
import type { UsersService } from '../users/users.service';
import type { AdminService } from '../admin/admin.service';

export interface TrpcContext {
  req: Request;
  user?: { id: string; email: string; role: string };
  authService: AuthService;
  sessionsService: SessionsService;
  usersService: UsersService;
  adminService: AdminService;
}

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Процедура с обязательной аутентификацией */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Требуется аутентификация' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Процедура только для администраторов */
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Доступ только для администраторов' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
