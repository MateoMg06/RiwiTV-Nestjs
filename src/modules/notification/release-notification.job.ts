import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from '../../common/utils/mail.js';
import { ReleaseNotificationDao } from './release-notification.dao.js';

/**
 * RN-020: cada hora envía el correo de las solicitudes `PENDING` cuya película ya está `ACTIVE`
 * y las pasa a `SENT`. Usa la zona horaria del proceso (`TZ`). Una sola instancia: con varias,
 * `markSent` condicional evita marcar dos veces pero el correo podría duplicarse.
 */
@Injectable()
export class ReleaseNotificationJob {
  private readonly logger = new Logger(ReleaseNotificationJob.name);
  /** Evita que una ejecución lenta se solape con la siguiente. */
  private running = false;

  constructor(
    private readonly dao: ReleaseNotificationDao,
    private readonly mail: MailService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'release-notifications' })
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const pending = await this.dao.findPendingForActiveMovies();
      for (const { id, email, name, movieTitle } of pending) {
        try {
          await this.mail.sendReleaseNotice(email, name, movieTitle);
          await this.dao.markSent(id);
        } catch (error) {
          // Sin email en el log. Si falló markSent tras enviar, se reenviará (riesgo aceptado).
          this.logger.error(
            `No se pudo avisar la solicitud ${id}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }
}
