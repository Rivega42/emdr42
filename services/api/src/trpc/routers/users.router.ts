import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';

export const usersRouter = router({
  /** GDPR: экспорт всех данных пользователя */
  exportData: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return ctx.usersService.exportAllData(input.userId);
    }),

  /** GDPR: удаление всех данных пользователя */
  deleteData: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.usersService.deleteAllData(input.userId);
      return { message: 'All session data has been deleted.' };
    }),

  /** Обновление профиля */
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      settings: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.usersService.update(ctx.user.id, input, ctx.user.id, ctx.user.role);
    }),

  /** Список пользователей (для админов) */
  list: adminProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input, ctx }) => {
      return ctx.adminService.getEnhancedUsers(input);
    }),
});
