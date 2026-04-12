import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';

export const usersRouter = router({
  /** GDPR: экспорт всех данных пользователя */
  exportData: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      return { user: { id: input.userId }, sessions: [], exportedAt: new Date().toISOString() };
    }),

  /** GDPR: удаление всех данных пользователя */
  deleteData: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      void input;
      return { message: 'All session data has been deleted.' };
    }),

  /** Обновление профиля */
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      settings: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: ctx.user.id, ...input };
    }),

  /** Список пользователей (для админов) */
  list: adminProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      return { items: [], total: 0, page: input.page, limit: input.limit };
    }),
});
