import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sanitizeNextPath,
} from '../auth';

describe('loginSchema', () => {
  it('валидирует корректные email + пароль', () => {
    const r = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'anything',
    });
    expect(r.success).toBe(true);
  });

  it('отклоняет невалидный email', () => {
    const r = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(r.success).toBe(false);
  });

  it('требует непустой пароль', () => {
    const r = loginSchema.safeParse({ email: 'a@b.c', password: '' });
    expect(r.success).toBe(false);
  });
});

describe('registerSchema — политика пароля', () => {
  const valid = {
    name: 'Test User',
    email: 'user@example.com',
    password: 'Str0ng!Passw0rd!',
    passwordConfirm: 'Str0ng!Passw0rd!',
    tosAccepted: true,
  };

  it('валидирует корректный набор', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('отклоняет пароль < 12 символов', () => {
    const r = registerSchema.safeParse({ ...valid, password: 'Sh0rt!', passwordConfirm: 'Sh0rt!' });
    expect(r.success).toBe(false);
  });

  it('требует заглавную, строчную, цифру, спецсимвол', () => {
    const cases = ['alllowercase123!', 'ALLUPPERCASE123!', 'NoDigitsHere!!!!', 'NoSpecial1234567'];
    for (const password of cases) {
      const r = registerSchema.safeParse({ ...valid, password, passwordConfirm: password });
      expect(r.success).toBe(false);
    }
  });

  it('отклоняет несовпадение пароля и подтверждения', () => {
    const r = registerSchema.safeParse({ ...valid, passwordConfirm: 'Different!Password1' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path.includes('passwordConfirm'));
      expect(issue?.message).toMatch(/совпада/i);
    }
  });

  it('требует tosAccepted=true', () => {
    expect(registerSchema.safeParse({ ...valid, tosAccepted: false }).success).toBe(false);
  });

  it('имя — минимум 2 символа', () => {
    expect(registerSchema.safeParse({ ...valid, name: 'X' }).success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('валидирует email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
  });
  it('отклоняет невалидный email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'bad' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  const valid = {
    token: 'abc123',
    password: 'Str0ng!Passw0rd!',
    passwordConfirm: 'Str0ng!Passw0rd!',
  };

  it('валидирует корректные данные', () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('требует token', () => {
    expect(resetPasswordSchema.safeParse({ ...valid, token: '' }).success).toBe(false);
  });

  it('пароль также подчиняется политике', () => {
    expect(
      resetPasswordSchema.safeParse({ ...valid, password: 'weak', passwordConfirm: 'weak' })
        .success,
    ).toBe(false);
  });
});

describe('sanitizeNextPath — защита от open-redirect', () => {
  it('возвращает fallback для пустого / undefined / non-string', () => {
    expect(sanitizeNextPath(null)).toBe('/dashboard');
    expect(sanitizeNextPath(undefined)).toBe('/dashboard');
    expect(sanitizeNextPath('')).toBe('/dashboard');
    expect(sanitizeNextPath(123 as never)).toBe('/dashboard');
  });

  it('кастомный fallback', () => {
    expect(sanitizeNextPath('', '/home')).toBe('/home');
  });

  it('пропускает обычный путь', () => {
    expect(sanitizeNextPath('/dashboard')).toBe('/dashboard');
    expect(sanitizeNextPath('/invite/abc-token')).toBe('/invite/abc-token');
  });

  it('блокирует protocol-relative (//evil.com)', () => {
    expect(sanitizeNextPath('//evil.com')).toBe('/dashboard');
    expect(sanitizeNextPath('//evil.com/path')).toBe('/dashboard');
  });

  it('блокирует backslash-redirect (/\\evil.com)', () => {
    expect(sanitizeNextPath('/\\evil.com')).toBe('/dashboard');
  });

  it('блокирует URL-encoded double-slash после decode', () => {
    // `/%2F%2Fevil.com` → decode `///evil.com` → начинается с `//` → blocked
    expect(sanitizeNextPath('/%2F%2Fevil.com')).toBe('/dashboard');
  });

  it('блокирует control characters (CRLF injection)', () => {
    expect(sanitizeNextPath('/dashboard\r\nSet-Cookie:evil')).toBe('/dashboard');
  });

  it('блокирует не-абсолютные пути', () => {
    expect(sanitizeNextPath('dashboard')).toBe('/dashboard');
    expect(sanitizeNextPath('http://evil.com')).toBe('/dashboard');
    expect(sanitizeNextPath('javascript:alert(1)')).toBe('/dashboard');
  });

  it('блокирует слишком длинные пути (> 512)', () => {
    expect(sanitizeNextPath('/' + 'a'.repeat(600))).toBe('/dashboard');
  });

  it('обрабатывает malformed URI-encoding (decodeURIComponent throws)', () => {
    expect(sanitizeNextPath('/%E0%A4%A')).toBe('/dashboard');
  });
});
