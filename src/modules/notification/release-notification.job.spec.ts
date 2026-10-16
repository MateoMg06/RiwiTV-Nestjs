import { describe, it, expect, vi } from 'vitest';
import { CronExpression } from '@nestjs/schedule';
import { ReleaseNotificationJob } from './release-notification.job.js';
import type { ReleaseNotificationDao } from './release-notification.dao.js';
import type { MailService } from '../../common/utils/mail.js';

const row = (id: number) => ({
  id,
  email: `u${id}@b.co`,
  name: `U${id}`,
  movieTitle: 'Peli',
});

function setup(rows = [row(1), row(2)]) {
  const dao = {
    findPendingForActiveMovies: vi.fn().mockResolvedValue(rows),
    markSent: vi.fn().mockResolvedValue(true),
  };
  const mail = { sendReleaseNotice: vi.fn().mockResolvedValue(undefined) };
  const job = new ReleaseNotificationJob(
    dao as unknown as ReleaseNotificationDao,
    mail as unknown as MailService,
  );
  const error = vi.spyOn(job['logger'], 'error').mockImplementation(() => undefined);
  return { dao, mail, job, error };
}

describe('ReleaseNotificationJob (HU-005, RN-020)', () => {
  it('envía un correo por fila y la marca como enviada', async () => {
    const { dao, mail, job } = setup();

    await job.run();

    expect(mail.sendReleaseNotice).toHaveBeenCalledTimes(2);
    expect(mail.sendReleaseNotice).toHaveBeenCalledWith('u1@b.co', 'U1', 'Peli');
    expect(mail.sendReleaseNotice).toHaveBeenCalledWith('u2@b.co', 'U2', 'Peli');
    expect(dao.markSent).toHaveBeenCalledWith(1);
    expect(dao.markSent).toHaveBeenCalledWith(2);
  });

  it('si una fila falla no detiene las demás, no lanza y no la marca', async () => {
    const { dao, mail, job, error } = setup([row(1), row(2), row(3)]);
    mail.sendReleaseNotice.mockRejectedValueOnce(new Error('smtp caído'));

    await expect(job.run()).resolves.toBeUndefined();

    expect(mail.sendReleaseNotice).toHaveBeenCalledTimes(3);
    expect(dao.markSent).toHaveBeenCalledTimes(2);
    expect(dao.markSent).not.toHaveBeenCalledWith(1);
    const logged = String(error.mock.calls[0][0]);
    expect(logged).toContain('1');
    expect(logged).toContain('smtp caído');
    expect(logged).not.toContain('u1@b.co');
  });

  it('sin filas no envía nada', async () => {
    const { dao, mail, job } = setup([]);

    await job.run();

    expect(mail.sendReleaseNotice).not.toHaveBeenCalled();
    expect(dao.markSent).not.toHaveBeenCalled();
  });

  it('una ejecución solapada sale sin consultar', async () => {
    const { dao, job } = setup();
    let release: (rows: object[]) => void = () => undefined;
    dao.findPendingForActiveMovies.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    const first = job.run();
    await job.run();

    expect(dao.findPendingForActiveMovies).toHaveBeenCalledTimes(1);
    release([]);
    await first;
  });

  it('running vuelve a false tras un error de consulta', async () => {
    const { dao, job } = setup();
    dao.findPendingForActiveMovies.mockRejectedValueOnce(new Error('bd caída'));

    await expect(job.run()).rejects.toThrow('bd caída');
    await job.run();

    expect(dao.findPendingForActiveMovies).toHaveBeenCalledTimes(2);
  });

  it('registra @Cron cada hora con el nombre release-notifications', () => {
    // Claves internas de @nestjs/schedule (no exportadas): SCHEDULE_CRON_OPTIONS y SCHEDULER_NAME.
    const options = Reflect.getMetadata(
      'SCHEDULE_CRON_OPTIONS',
      ReleaseNotificationJob.prototype.run,
    );
    const name = Reflect.getMetadata('SCHEDULER_NAME', ReleaseNotificationJob.prototype.run);

    expect(options).toMatchObject({ cronTime: CronExpression.EVERY_HOUR });
    expect(name).toBe('release-notifications');
  });
});
