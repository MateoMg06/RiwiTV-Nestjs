import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nodemailer from 'nodemailer';
import { MailService } from './mail.js';
import { ConfigService } from '../../config/config.service.js';

const sendMail = vi.fn();

vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail })) },
}));

const configWith = (values: Record<string, string>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('MailService (HU-006)', () => {
  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue({});
    vi.mocked(nodemailer.createTransport).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('con SMTP_HOST usa SMTP y envía el enlace correcto en texto plano', async () => {
    const mail = new MailService(
      configWith({
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '465',
        SMTP_USER: 'u',
        SMTP_PASS: 'p',
        SMTP_FROM: 'RiwiTV <hola@example.com>',
        FRONTEND_URL: 'https://riwitv.example.com',
      }),
    );

    await mail.sendActivation('ana@example.com', 'Ana', 'tok123');

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: { user: 'u', pass: 'p' },
    });
    const sent = sendMail.mock.calls[0][0];
    expect(sent).toMatchObject({ from: 'RiwiTV <hola@example.com>', to: 'ana@example.com' });
    expect(sent.text).toContain('https://riwitv.example.com/verify-email?token=tok123');
    expect(sent.text).toContain('Hola Ana');
    expect(sent.html).toBeUndefined();
  });

  it('sin SMTP_HOST usa jsonTransport (emulado) y no lanza', async () => {
    const mail = new MailService(configWith({}));

    await expect(mail.sendActivation('ana@example.com', 'Ana', 'tok123')).resolves.toBeUndefined();

    expect(nodemailer.createTransport).toHaveBeenCalledWith({ jsonTransport: true });
    expect(sendMail.mock.calls[0][0].text).toContain(
      'http://localhost:3000/verify-email?token=tok123',
    );
  });

  it('el envío emulado no escribe el token en el log en producción', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const mail = new MailService(configWith({}));
    const log = vi.spyOn(mail['logger'], 'log').mockImplementation(() => undefined);

    await mail.sendActivation('ana@example.com', 'Ana', 'tok123');

    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0][0])).toContain('ana@example.com');
    expect(String(log.mock.calls[0][0])).not.toContain('tok123');
  });

  it('fuera de producción el log emulado incluye el enlace', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const mail = new MailService(configWith({}));
    const log = vi.spyOn(mail['logger'], 'log').mockImplementation(() => undefined);

    await mail.sendActivation('ana@example.com', 'Ana', 'tok123');

    expect(String(log.mock.calls[0][0])).toContain('verify-email?token=tok123');
  });

  it('propaga el error si el transporte falla', async () => {
    sendMail.mockRejectedValue(new Error('smtp caído'));
    const mail = new MailService(configWith({ SMTP_HOST: 'smtp.example.com' }));

    await expect(mail.sendActivation('a@b.co', 'A', 't')).rejects.toThrow('smtp caído');
  });

  describe('sendPasswordReset (HU-007)', () => {
    it('envía texto plano en español con el enlace de restablecimiento', async () => {
      const mail = new MailService(
        configWith({ SMTP_HOST: 'smtp.example.com', FRONTEND_URL: 'https://riwitv.example.com' }),
      );

      await mail.sendPasswordReset('ana@example.com', 'Ana', 'tok123');

      const sent = sendMail.mock.calls[0][0];
      expect(sent.to).toBe('ana@example.com');
      expect(sent.text).toContain('Hola Ana');
      expect(sent.text).toContain('https://riwitv.example.com/reset-password?token=tok123');
      expect(sent.html).toBeUndefined();
    });

    it('el log emulado incluye el enlace solo fuera de producción', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const dev = new MailService(configWith({}));
      const devLog = vi.spyOn(dev['logger'], 'log').mockImplementation(() => undefined);
      await dev.sendPasswordReset('ana@example.com', 'Ana', 'tok123');
      expect(String(devLog.mock.calls[0][0])).toContain('reset-password?token=tok123');

      vi.stubEnv('NODE_ENV', 'production');
      const prod = new MailService(configWith({}));
      const prodLog = vi.spyOn(prod['logger'], 'log').mockImplementation(() => undefined);
      await prod.sendPasswordReset('ana@example.com', 'Ana', 'tok123');
      expect(String(prodLog.mock.calls[0][0])).toContain('ana@example.com');
      expect(String(prodLog.mock.calls[0][0])).not.toContain('tok123');
    });
  });

  describe('sendReleaseNotice (HU-005)', () => {
    it('envía texto plano en español con el título de la película', async () => {
      const mail = new MailService(configWith({ SMTP_HOST: 'smtp.example.com' }));

      await mail.sendReleaseNotice('ana@example.com', 'Ana', 'Noche en Medellín');

      const sent = sendMail.mock.calls[0][0];
      expect(sent.to).toBe('ana@example.com');
      expect(sent.subject).toContain('Noche en Medellín');
      expect(sent.text).toContain('Hola Ana');
      expect(sent.text).toContain('Noche en Medellín ya está en cartelera');
      expect(sent.html).toBeUndefined();
    });

    it('sin SMTP_HOST se emula y se registra el destinatario', async () => {
      const mail = new MailService(configWith({}));
      const log = vi.spyOn(mail['logger'], 'log').mockImplementation(() => undefined);

      await mail.sendReleaseNotice('ana@example.com', 'Ana', 'Noche en Medellín');

      expect(nodemailer.createTransport).toHaveBeenCalledWith({ jsonTransport: true });
      expect(String(log.mock.calls[0][0])).toContain('Correo emulado');
      expect(String(log.mock.calls[0][0])).toContain('ana@example.com');
    });

    it('propaga el error si el transporte falla', async () => {
      sendMail.mockRejectedValue(new Error('smtp caído'));
      const mail = new MailService(configWith({ SMTP_HOST: 'smtp.example.com' }));

      await expect(mail.sendReleaseNotice('a@b.co', 'A', 'Peli')).rejects.toThrow('smtp caído');
    });
  });
});
