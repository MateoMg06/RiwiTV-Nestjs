import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from './user.entity.js';

/**
 * Acceso a datos de usuarios.
 *
 * REGLA: el DAO solo habla con `User`. Si alguna vez necesita consultar otra
 * tabla (por ejemplo, resolver el nombre de una ciudad), eso pertenece a un
 * servicio que inyecta ambos DAOs. Mezclar repositorios aqui crea acoplamiento
 * oculto y hace imposible testear el DAO sin montar media base de datos.
 */
@Injectable()
export class UserDao {
  constructor(private readonly dataSource: DataSource) {}

  private get repo(): Repository<User> {
    return this.dataSource.getRepository(User);
  }

  findAll(): Promise<User[]> {
    return this.repo.find();
  }

  findById(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * `password` esta declarado con `select: false` en la entidad, asi que
   * NUNCA sale en las consultas normales. Esto es intencional: sin esto, un
   * `findAll()` devuelto por el controller expondría los hashes a cualquier
   * endpoint de listado.
   */
  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  /**
   * Consulta EXPLICITA que si trae el hash. Solo debe llamarla el flujo de
   * login: es el unico punto del sistema que necesita comparar contrasenas.
   *
   * Si se olvida `addSelect`, TypeORM devuelve `password: undefined` y el
   * login fallaria siempre, de forma confusa. Por eso el select va explicito.
   */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .addSelect('user.failedLoginAttempts')
      .addSelect('user.lockedUntil')
      .addSelect('user.accountStatus')
      .where('user.email = :email', { email })
      .getOne();
  }

  findByDocumentNumber(documentNumber: string): Promise<User | null> {
    return this.repo.findOne({ where: { documentNumber } });
  }

  /**
   * Busca el usuario por su token de activacion.
   *
   * Igual que `findByEmailWithPassword`, requiere `addSelect` explicito: la
   * columna esta declarada con `select: false` y sin esto devolveria `undefined`
   * en el WHERE, haciendo que la activacion fallara siempre.
   *
   * La busqueda es por el token EN CRUDO y no por su hash. A diferencia del
   * refresh token, aqui no se guarda hash: el token de activacion no da acceso
   * a la sesion, solo habilita una cuenta que el propio usuario acaba de crear.
   * Aun asi, viaja por correo y tiene caducidad de 24 horas.
   */
  findByActivationToken(token: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.activationToken')
      .addSelect('user.activationTokenExpires')
      .where('user.activationToken = :token', { token })
      .getOne();
  }

  /**
   * Busca el usuario por el SHA-256 de su token de restablecimiento (HU-007). `resetToken` y
   * `resetTokenExpires` son `select: false`: igual que en `findByActivationToken`, sin
   * `addSelect` el WHERE no los vería y el service no podría comprobar la caducidad.
   */
  findByResetTokenHash(hash: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.resetToken')
      .addSelect('user.resetTokenExpires')
      .where('user.resetToken = :hash', { hash })
      .getOne();
  }

  /**
   * Guarda la nueva contraseña y anula el token de restablecimiento en un único UPDATE
   * condicional (HU-007): solo prospera si el hash sigue vigente. Así, dos peticiones
   * simultáneas con el mismo token no pueden pasar ambas; devuelve `false` si no hubo fila.
   */
  async consumeResetToken(id: number, hash: string, passwordHash: string): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .update(User)
      .set({ password: passwordHash, resetToken: null, resetTokenExpires: null })
      .where('id = :id AND resetToken = :hash AND resetTokenExpires > :now', {
        id,
        hash,
        now: new Date(),
      })
      .execute();
    return result.affected === 1;
  }

  /** Con `manager` participa en la transacción del registro (HU-006). */
  create(data: Partial<User>, manager?: EntityManager): Promise<User> {
    const repo = manager ? manager.getRepository(User) : this.repo;
    return repo.save(repo.create(data));
  }

  async update(id: number, data: Partial<User>): Promise<User | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
