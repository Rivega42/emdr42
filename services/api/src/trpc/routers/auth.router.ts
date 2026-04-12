import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['PATIENT', 'THERAPIST']).optional().default('PATIENT'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});

export const authRouter = router({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      // TODO: Подключить AuthService через DI
      return { id: crypto.randomUUID(), email: input.email, name: input.name, role: input.role };
    }),

  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      // TODO: Подключить AuthService через DI
      return { access_token: '', user: { id: '', email: input.email, name: '', role: 'PATIENT' as const } };
    }),

  forgotPassword: publicProcedure
    .input(forgotPasswordSchema)
    .mutation(async () => {
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }),

  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async () => {
      return { message: 'Password has been reset successfully.' };
    }),
});
