import { redactPii } from '../pii-redactor';

describe('redactPii', () => {
  it('redacts email', () => {
    const out = redactPii('Contact: jane@example.com.');
    expect(out).not.toContain('jane@example.com');
    expect(out).toContain('[REDACTED]');
  });

  it('redacts credit card numbers', () => {
    const out = redactPii('Card 4242 4242 4242 4242');
    expect(out).not.toContain('4242');
  });

  it('redacts SSN and INN', () => {
    expect(redactPii('SSN 123-45-6789')).not.toContain('123-45-6789');
    expect(redactPii('ИНН: 7712345678')).not.toContain('7712345678');
  });

  it('redacts IP addresses', () => {
    expect(redactPii('ip 192.168.1.1')).not.toContain('192.168.1.1');
  });

  it('redacts date of birth', () => {
    const out = redactPii('Born 1990-05-12 and 12/05/1990');
    expect(out).not.toContain('1990-05-12');
    expect(out).not.toContain('12/05/1990');
  });

  it('redacts personal names when provided', () => {
    const out = redactPii('John went to the doctor.', { personalNames: ['John'] });
    expect(out).not.toContain('John');
  });

  it('does not crash on empty input', () => {
    expect(redactPii('')).toBe('');
  });
});
