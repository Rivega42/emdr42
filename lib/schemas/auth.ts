import { z } from 'zod';

// Минимум 12 символов: 1 заглавная, 1 строчная, 1 цифра, 1 спецсимвол.
// Согласовано с подсказкой на app/register/page.tsx:117.
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{12,}$/;

const passwordField = z
  .string()
  .min(12, 'Минимум 12 символов')
  .regex(
    PASSWORD_RE,
    'Нужны заглавная, строчная, цифра и спецсимвол',
  );

const emailField = z
  .string()
  .min(1, 'Email обязателен')
  .email('Некорректный email')
  .max(255);

const nameField = z
  .string()
  .min(2, 'Минимум 2 символа')
  .max(100, 'Максимум 100 символов');

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Пароль обязателен'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: nameField,
    email: emailField,
    password: passwordField,
    passwordConfirm: z.string().min(1, 'Повторите пароль'),
    tosAccepted: z
      .boolean()
      .refine((v) => v === true, {
        message: 'Согласие с ToS и Privacy обязательно',
      }),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Пароли не совпадают',
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Токен обязателен'),
    password: passwordField,
    passwordConfirm: z.string().min(1, 'Повторите пароль'),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Пароли не совпадают',
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Whitelist для post-login redirect.
 * Принимаем только относительные пути, начинающиеся с `/` и без protocol-relative
 * префикса (`//` или `/\`), чтобы заблокировать open-redirect через `?next=//evil.com`.
 */
export function sanitizeNextPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return fallback;
  if (raw.length > 512) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  return raw;
}
