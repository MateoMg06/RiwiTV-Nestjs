import { describe, it, expect, vi } from 'vitest';
import { CronExpression } from '@nestjs/schedule';
import { SeatLockExpiryJob } from './seat-lock-expiry.job.js';
import type { ReservationService } from './reservation.service.js';

function setup(released = 2) {
  const service = { releaseExpired: vi.fn().mockResolvedValue(released) };
  const job = new SeatLockExpiryJob(service as unknown as ReservationService);
  const log = vi.spyOn(job['logger'], 'log').mockImplementation(() => undefined);
  const error = vi.spyOn(job['logger'], 'error').mockImplementation(() => undefined);
  return { service, job, log, error };
}

describe('SeatLockExpiryJob (HU-010)', () => {
  it('libera las vencidas y registra la cantidad', async () => {
    const { service, job, log } = setup(3);

    await job.run();

    expect(service.releaseExpired).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('3'));
  });

  it('sin vencidas no registra nada', async () => {
    const { job, log } = setup(0);

    await job.run();

    expect(log).not.toHaveBeenCalled();
  });

  it('un error se registra sin romper y la siguiente ejecución corre', async () => {
    const { service, job, error } = setup();
    service.releaseExpired.mockRejectedValueOnce(new Error('bd caída'));

    await expect(job.run()).resolves.toBeUndefined();
    await job.run();

    expect(String(error.mock.calls[0][0])).toContain('bd caída');
    expect(service.releaseExpired).toHaveBeenCalledTimes(2);
  });

  it('una ejecución solapada sale sin liberar', async () => {
    const { service, job } = setup();
    let finish: (n: number) => void = () => undefined;
    service.releaseExpired.mockReturnValueOnce(
      new Promise<number>((resolve) => {
        finish = resolve;
      }),
    );

    const first = job.run();
    await job.run();

    expect(service.releaseExpired).toHaveBeenCalledTimes(1);
    finish(0);
    await first;
  });

  it('registra @Cron cada minuto con el nombre seat-lock-expiry', () => {
    // Claves internas de @nestjs/schedule (no exportadas): SCHEDULE_CRON_OPTIONS y SCHEDULER_NAME.
    const options = Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', SeatLockExpiryJob.prototype.run);
    const name = Reflect.getMetadata('SCHEDULER_NAME', SeatLockExpiryJob.prototype.run);

    expect(options).toMatchObject({ cronTime: CronExpression.EVERY_MINUTE });
    expect(name).toBe('seat-lock-expiry');
  });
});
