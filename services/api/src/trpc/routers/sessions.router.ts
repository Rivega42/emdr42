import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

const createSessionSchema = z.object({
  targetMemory: z.string().optional(),
  targetImage: z.string().optional(),
  negativeCognition: z.string().optional(),
  positiveCognition: z.string().optional(),
  initialEmotions: z.array(z.string()).optional(),
  bodyLocation: z.string().optional(),
  blsPattern: z.enum(['horizontal', 'diagonal', 'circular', 'infinity', 'random']).optional(),
  blsSpeed: z.number().min(0.1).max(5.0).optional(),
});

const updateSessionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABORTED']).optional(),
  phase: z.enum(['HISTORY', 'PREPARATION', 'ASSESSMENT', 'DESENSITIZATION', 'INSTALLATION', 'BODY_SCAN', 'CLOSURE', 'REEVALUATION']).optional(),
  sudsBaseline: z.number().int().min(0).max(10).optional(),
  sudsFinal: z.number().int().min(0).max(10).optional(),
  vocBaseline: z.number().int().min(1).max(7).optional(),
  vocFinal: z.number().int().min(1).max(7).optional(),
});

const sessionQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABORTED']).optional(),
});

const sudsRecordSchema = z.object({
  sessionId: z.string().uuid(),
  timestamp: z.number(),
  value: z.number().int().min(0).max(10),
  context: z.string(),
});

const vocRecordSchema = z.object({
  sessionId: z.string().uuid(),
  timestamp: z.number(),
  value: z.number().int().min(1).max(7),
  context: z.string(),
});

export const sessionsRouter = router({
  create: protectedProcedure
    .input(createSessionSchema)
    .mutation(async ({ input, ctx }) => {
      // TODO: Подключить SessionsService через DI
      return { id: crypto.randomUUID(), userId: ctx.user.id, ...input, status: 'SCHEDULED' as const };
    }),

  list: protectedProcedure
    .input(sessionQuerySchema)
    .query(async ({ input, ctx }) => {
      void ctx;
      return { items: [], total: 0, page: input.page, limit: input.limit };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return { id: input.id, status: 'SCHEDULED' as const };
    }),

  update: protectedProcedure
    .input(updateSessionSchema)
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      return { id, ...rest };
    }),

  addSuds: protectedProcedure
    .input(sudsRecordSchema)
    .mutation(async ({ input }) => {
      return { id: crypto.randomUUID(), ...input };
    }),

  addVoc: protectedProcedure
    .input(vocRecordSchema)
    .mutation(async ({ input }) => {
      return { id: crypto.randomUUID(), ...input };
    }),

  compare: protectedProcedure
    .input(z.object({ id: z.string().uuid(), previousId: z.string().uuid() }))
    .query(async ({ input }) => {
      return { sessionId: input.id, previousId: input.previousId, comparison: {} };
    }),
});
