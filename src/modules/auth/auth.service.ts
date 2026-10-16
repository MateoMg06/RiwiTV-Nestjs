import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { JwtPayload } from 'jsonwebtoken';
import { AuthDao } from './auth.dao.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponse, AuthUser } from './interfaces/auth-response.interface.js';
import { UserService } from '../user/user.service.js';
import { MembershipService } from '../membership/membership.service.js';
import { UserDao } from '../user/user.dao.js';
import { RegisterDto } from './dto/register.dto.js';
import { User } from '../user/user.entity.js';
import { Bcrypt } from '../../common/utils/bcrypt.js';
import { MailService } from '../../common/utils/mail.js';
import { Jwt } from '../../common/utils/jwt.js';
import { TokenExpiry } from '../../common/utils/token-expiry.js';
import { ConfigService } from '../../config/config.service.js';
import { Config } from '../../config/config.keys.js';
import { AccountStatus, MembershipStatus, UserRole } from '../../common/enums/domain.enums.js';
import { Captcha, CaptchaChallenge } from '../../common/utils/captcha.js';

/** Contexto de la peticion, necesario para auditar la sesion. */
export interface SessionContext {
  userAgent?: string;
  ip?: string;
}

const DEFAULT_ACCESS_EXPIRY = '15m';
const DEFAULT_REFRESH_EXPIRY = '7d';
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_SALT_ROUNDS = 10;
const DEFAULT_ACCESS_TTL_MS = 900_000; // 15 minutos
const DEFAULT_REFRESH_TTL_MS = 604_800_000; // 7 dias

/** Minutos que dura un bloqueo por intentos fallidos. */
const LOCK_DURATION_MINUTES = 15;

/** Horas de validez del token de activacion de cuenta. */
const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Hash bcrypt valido y fijo, usado SOLO para igualar el tiempo de respuesta
 * cuando el correo no existe. No corresponde a ninguna contrasena real.
 */
const DUMMY_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly saltRounds: number;
  private readonly maxFailedAttempts: number;

  constructor(
    private readonly authDao: AuthDao,
    private readonly userService: UserService,
    private readonly userDao: UserDao,
    private readonly bcrypt: Bcrypt,
    private readonly jwt: Jwt,
    private readonly tokenExpiry: TokenExpiry,
    private readonly configService: ConfigService,
    private readonly captcha: Captcha,
    private readonly dataSource: DataSource,
    private readonly membershipService: MembershipService,
    private readonly mail: MailService,
  ) {
    this.saltRounds = Number(process.env.SALT_ROUNDS ?? DEFAULT_SALT_ROUNDS);
    this.maxFailedAttempts = Number(
      this.configService.get(Config.MAX_FAILED_ATTEMPTS) ??
        process.env.MAX_FAILED_ATTEMPTS ??
        DEFAULT_MAX_ATTEMPTS,
    );
  }

  // ---------------------------------------------------------------- captcha

  /**
   * Genera un nuevo CAPTCHA para el registro.
   * Publico porque se necesita antes de registrarse.
   */
  async getCaptcha(): Promise<CaptchaChallenge> {
    return this.captcha.generateCaptcha();
  }

  // ---------------------------------------------------------------- register

  /**
   * Alta de usuario.
   *
   * DECISION: la cuenta nace INACTIVA (lo define el default de la entidad) y se
   * genera un token de activacion. Hasta que el usuario lo confirma no puede
   * iniciar sesion. Activar cuentas de forma automatica permitiria que cualquiera
   * se registrara con el correo de otra persona y reservara entradas a su
   * nombre.
   *
   * El `role` se fija aqui de forma explicita a `USUARIO`. Aunque `RegisterDto`
   * ya omite el campo, esta linea es la garantia real: si manana alguien
   * cambia el DTO o llama a `UserService.create()` desde otro sitio, el rol
   * sigue sin poder venir del cliente.
   *
   * Usuario y membresia se crean en una sola transaccion (HU-006): si la membresia
   * falla no queda un usuario sin ella. El token de activacion va en el mismo INSERT.
   *
   * El token de activacion se devuelve en la respuesta SOLO fuera de produccion.
   * En produccion viajaria por correo; devolverlo en el JSON de la respuesta
   * seria equivale a no verificar nada, porque cualquiera que potentiellement
   *seitese registre (incluso con el correo de otra persona) lo leeria.
   */
  async register(dto: RegisterDto): Promise<{
    user: AuthUser;
    membership: { code: string; status: MembershipStatus };
    activationToken?: string;
  }> {
    // Validar CAPTCHA antes de procesar el registro
    if (!dto.captchaToken || typeof dto.captchaAnswer !== 'number') {
      throw new BadRequestException('CAPTCHA requerido');
    }
    if (!this.captcha.verifyCaptcha(dto.captchaToken, dto.captchaAnswer)) {
      throw new BadRequestException('Respuesta de CAPTCHA incorrecta');
    }

    const activationToken = randomBytes(32).toString('hex');
    const activationTokenExpires = new Date(Date.now() + ACTIVATION_TTL_MS);

    const { user, membership } = await this.dataSource.transaction(async (manager) => {
      const created = await this.userService.create({ ...dto, role: UserRole.USUARIO }, manager, {
        activationToken,
        activationTokenExpires,
      });
      const membership = await this.membershipService.createForUser(created.id, manager);
      return { user: created, membership };
    });

    // Tras el commit: un fallo de envio se registra (sin token) pero no revierte el registro.
    try {
      await this.mail.sendActivation(user.email, user.name, activationToken);
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo de activacion a ${user.email}: ${(error as Error).message}`,
      );
    }

    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      this.logger.log(
        `Token de activacion para ${user.email}: ${activationToken} (entorno de desarrollo)`,
      );
    }

    return {
      user: this.toAuthUser(user),
      membership: { code: membership.code, status: membership.status },
      ...(isProduction ? {} : { activationToken }),
    };
  }

  /**
   * Confirma la cuenta con el token recibido por correo.
   *
   * El token se invalida (se pone a null) en el mismo UPDATE que activa la
   * cuenta, de forma atomica. Asi el enlace solo sirve una vez: reenviar el
   * correo de activacion no debe permitir reutilizar un token viejo.
   */
  async activate(token: string): Promise<AuthUser> {
    const user = await this.userDao.findByActivationToken(token);

    if (!user) {
      throw new BadRequestException('Token de activacion invalido');
    }

    if (user.activationTokenExpires && user.activationTokenExpires.getTime() < Date.now()) {
      throw new BadRequestException('El token de activacion ha expirado');
    }

    const updated = await this.userDao.update(user.id, {
      accountStatus: AccountStatus.ACTIVE,
      activationToken: null,
      activationTokenExpires: null,
    });

    return this.toAuthUser(updated ?? user);
  }

  // ------------------------------------------------------------------- login

  async login(dto: LoginDto, context: SessionContext = {}): Promise<AuthResponse> {
    const user = await this.userDao.findByEmailWithPassword(dto.email);

    // Si el correo no existe, se compara igual contra un hash ficticio. Sin
    // esto, un atacante mide la diferencia de tiempo entre "correo no existe"
    // (rapido, sin bcrypt) y "contrasena incorrecta" (lento, con bcrypt) y
    // podria enumerar los correos registrados. Con esto ambos caminos
    // cuestan exactamente lo mismo.
    const hashToCompare = user?.password ?? DUMMY_HASH;
    const passwordMatches = await this.bcrypt.comparePassword(dto.password, hashToCompare);

    if (!user || !passwordMatches) {
      if (user) {
        await this.registerFailedAttempt(user);
      }
      // Mensaje unico para ambos casos: no revela si el correo existe.
      throw new UnauthorizedException('Correo o contrasena incorrectos');
    }

    this.assertNotLocked(user);
    this.assertIsActive(user);

    // Login correcto: se limpia el contador de fallos y el bloqueo.
    await this.userDao.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAttemptAt: new Date(),
    });

    return this.issueTokens(user, context);
  }

  // ----------------------------------------------------------------- refresh

  /**
   * Canje de refresh token CON ROTACION.
   *
   * Por que rotar en vez de solo renovar: si un refresh token robado se usa
   * dos veces, la segunda vez la fila ya fue revocada por el uso legitimo.
   * Eso es senal de reutilizacion, y es la unica indicacion fiable de robo.
   * Ante esa senal se revocan TODAS las sesiones del usuario, porque no hay
   * forma de saber cual de las dos es la falsa.
   */
  async refresh(refreshToken: string, context: SessionContext = {}): Promise<AuthResponse> {
    const session = await this.authDao.findByRefreshTokenHash(this.hashToken(refreshToken));

    if (!session) {
      throw new UnauthorizedException('Refresh token invalido');
    }

    if (session.revokedAt !== null) {
      this.logger.warn(
        `Reutilizacion de refresh token detectada para usuario ${session.userId}. ` +
          'Revocando todas sus sesiones.',
      );
      await this.authDao.revokeAllSessions(session.userId);
      throw new UnauthorizedException('Sesion invalida, por favor inicia sesion de nuevo');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('La sesion expiro, por favor inicia sesion de nuevo');
    }

    const user = await this.userService.findOne(session.userId);

    // Si la cuenta se desactivo o elimino despues de abrir la sesion, el
    // refresh debe fallar. Sin esto, una cuenta suspendida podria seguir
    // operando hasta que su refresh token expire.
    this.assertIsActive(user);

    // Se revoca la sesion vieja ANTES de emitir la nueva.
    await this.authDao.revokeSession(session.id);

    return this.issueTokens(user, context);
  }

  // ------------------------------------------------------------------ logout

  /**
   * Cierra la sesion actual.
   *
   * No propaga error si la sesion ya no existe: el objetivo del cliente
   * (quedarse sin sesion) ya se cumple. Devolver 401 confunde al frontend y lo
   * obliga a manejar un caso que en realidad es un exito.
   */
  async logout(refreshToken: string): Promise<void> {
    const session = await this.authDao.findByRefreshTokenHash(this.hashToken(refreshToken));

    if (!session || session.revokedAt !== null) {
      return;
    }

    await this.authDao.revokeSession(session.id);
  }

  /** "Cerrar sesion en todos los dispositivos". */
  async logoutAll(userId: number): Promise<void> {
    await this.authDao.revokeAllSessions(userId);
  }

  // ---------------------------------------------------------------- privado

  /**
   * Emite un access token (corto) y un refresh token (largo), y registra la
   * sesion.
   *
   * El refresh se firma con un secreto DISTINTO al de acceso: asi, una fuga
   * del secreto de acceso no permite fabricar refresh tokens.
   */
  private async issueTokens(user: User, context: SessionContext): Promise<AuthResponse> {
    const accessSecret = this.requireSecret(Config.JWT_SECRET, 'JWT_SECRET');
    const refreshSecret = this.requireSecret(Config.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');

    const accessExpiry = process.env.JWT_ACCESS_EXPIRES_IN ?? DEFAULT_ACCESS_EXPIRY;
    const refreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN ?? DEFAULT_REFRESH_EXPIRY;

    // Se calcula la DURACION una sola vez y se reutiliza en tres sitios: la
    // expiracion del token, la fecha de la sesion y el `expiresIn` de la
    // respuesta. Si se parseara la cadena por separado en cada uno, cualquier
    // cambio futuro podria desalinearlos.
    const accessTtlMs = this.tokenExpiry.parseExpiryToMs(accessExpiry, DEFAULT_ACCESS_TTL_MS);
    const refreshTtlMs = this.tokenExpiry.parseExpiryToMs(refreshExpiry, DEFAULT_REFRESH_TTL_MS);

    // jsonwebtoken acepta segundos numericos. Se usan en vez de la cadena
    // ("15m") porque asi el TTL derivado arriba y el TTL real del token son
    // literalmente el mismo numero y no pueden divergir.
    const accessSeconds = Math.floor(accessTtlMs / 1000);
    const refreshSeconds = Math.floor(refreshTtlMs / 1000);

    const payload: JwtPayload = {
      sub: String(user.id),
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwt.createToken(payload, accessSecret, {
      expiresIn: accessSeconds,
    });

    // El refresh lleva `sub` pero NO lleva rol ni email: un refresh token es
    // una credencial de renovacion, no un perfil. Si llevara el rol, bastaria
    // reutilizar un refresh viejo despues de una degradacion de permisos.
    const refreshToken = this.jwt.createToken(
      { sub: String(user.id), typ: 'refresh' },
      refreshSecret,
      { expiresIn: refreshSeconds },
    );

    await this.authDao.createSession({
      userId: user.id,
      refreshTokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtlMs),
      revokedAt: null,
      lastUsedAt: null,
      userAgent: context.userAgent ?? null,
      ip: context.ip ?? null,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessSeconds,
      user: this.toAuthUser(user),
    };
  }

  /**
   * Suma un intento fallido y bloquea la cuenta al superar el maximo.
   *
   * El bloqueo es TEMPORAL, no permanente: un ataque automatizado contra una
   * cuenta real no debe dejar al usuario fuera para siempre. Al expirar
   * `lockedUntil`, el acceso se restaura y el contador ya quedo en cero.
   */
  private async registerFailedAttempt(user: User): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;

    const patch: Partial<User> = {
      failedLoginAttempts: attempts,
      lastLoginAttemptAt: new Date(),
    };

    if (attempts >= this.maxFailedAttempts) {
      patch.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60_000);
      patch.failedLoginAttempts = 0;

      this.logger.warn(
        `Cuenta ${user.id} bloqueada por ${LOCK_DURATION_MINUTES} minutos ` +
          `tras ${attempts} intentos fallidos.`,
      );
    }

    await this.userDao.update(user.id, patch);
  }

  private assertNotLocked(user: User): void {
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new ForbiddenException(
        `Cuenta bloqueada temporalmente por intentos fallidos. ` +
          `Intenta de nuevo en ${minutes} minuto(s).`,
      );
    }
  }

  private assertIsActive(user: User): void {
    if (user.accountStatus !== AccountStatus.ACTIVE) {
      throw new ForbiddenException('La cuenta no esta activa. Verifica tu correo.');
    }
  }

  /**
   * SHA-256 del token, no bcrypt.
   *
   * bcrypt es lento a proposito para CONTRASENAS, porque el atacante elige el
   * valor que adivina. Aqui el valor lo genera el servidor con alta entropia:
   * no hay diccionario que atacar, asi que la lentitud solo castigaria cada
   * renovacion de token.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Falla ruidosamente si el secreto no esta. Preferimos que el proceso NO
   * pueda emitir tokens firmados por un secreto vacio: el error de despliegue
   * debe ser visible de inmediato, no aparecer meses despues como sesiones
   * invalidas.
   */
  private requireSecret(key: string, label: string): string {
    const value = this.configService.get(key);
    if (!value) {
      this.logger.error(`${label} no configurado. La autenticacion no puede funcionar.`);
      throw new UnauthorizedException('Error de configuracion de autenticacion');
    }
    return value;
  }

  /**
   * Proyeccion explicita del usuario.
   *
   * No se devuelve la entidad: asi es IMPOSIBLE colar por accidente `password`,
   * `resetToken` o `activationToken` en una respuesta, porque el tipo de
   * retorno no los tiene. Exponer un hash obliga a rotar todas las contrasenas.
   */
  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
  }
}
