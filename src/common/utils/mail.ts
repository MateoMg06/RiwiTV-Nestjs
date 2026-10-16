import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { ConfigService } from '../../config/config.service.js';
import { Config } from '../../config/config.keys.js';

const DEFAULT_FROM = 'RiwiTV <no-reply@riwitv.local>';
const DEFAULT_FRONTEND_URL = 'http://localhost:3000';
const DEFAULT_SMTP_PORT = 587;

/**
 * Envío de correos (HU-006). Con `SMTP_HOST` usa SMTP real; sin él, el proyecto es educativo y
 * no hay servicio de correo: se usa el transporte integrado `jsonTransport` de nodemailer, que
 * no sale a la red, y el envío queda registrado en el log como «emulado».
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly emulated: boolean;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(config: ConfigService) {
    const host = config.get(Config.SMTP_HOST);
    this.emulated = !host;
    this.from = config.get(Config.SMTP_FROM) || DEFAULT_FROM;
    this.frontendUrl = config.get(Config.FRONTEND_URL) || DEFAULT_FRONTEND_URL;

    if (host) {
      const port = Number(config.get(Config.SMTP_PORT) || DEFAULT_SMTP_PORT);
      const user = config.get(Config.SMTP_USER);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        ...(user ? { auth: { user, pass: config.get(Config.SMTP_PASS) } } : {}),
      });
    } else {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    }
  }

  /**
   * Correo con el enlace de activación (token de 24 h). Lanza si el envío falla: quien llama
   * decide si eso revierte algo (en el registro no).
   */
  async sendActivation(to: string, name: string, token: string): Promise<void> {
    const subject = 'Activa tu cuenta de RiwiTV';
    const link = `${this.frontendUrl}/verify-email?token=${token}`;
    const text =
      `Hola ${name},\n\n` +
      `Gracias por registrarte en RiwiTV. Para activar tu cuenta abre este enlace:\n${link}\n\n` +
      'El enlace es válido durante 24 horas. Si no creaste la cuenta, ignora este correo.';

    await this.transporter.sendMail({ from: this.from, to, subject, text });

    if (this.emulated) {
      // El enlace lleva el token: solo se muestra fuera de producción (agent.md §8).
      const suffix = process.env.NODE_ENV === 'production' ? '' : `, enlace ${link}`;
      this.logger.log(
        `Correo emulado (sin SMTP_HOST): destinatario ${to}, asunto "${subject}"${suffix}`,
      );
    }
  }
}
