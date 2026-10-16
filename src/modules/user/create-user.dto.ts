import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, enumValues } from '../../common/enums/domain.enums.js';

/**
 * DTO de alta de usuario.
 *
 * CAMBIO DE DISENO: `city` (nombre en texto) -> `cityId` (id numerico).
 * Resolver el nombre dentro del User obligaba a que el DAO de usuarios
 * consultara el repositorio de ciudades: acoplamiento entre dominios que no
 * existe y que hacia imposible reutilizar el DAO. El frontend ya tiene la
 * lista de ciudades, envia el id y el servidor lo valida con una FK.
 */
export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 60)
  name: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 60)
  lastName: string;

  @IsEmail()
  email: string;

  @IsEmail()
  confirmEmail: string;

  /**
   * Solo se guarda el hash. La longitud minima de 10 (RN-022) se aplica ANTES de
   * pasar por bcrypt: si se validara despues, el usuario ya estaria creado.
   */
  @IsNotEmpty()
  @IsString()
  @Length(10, 72)
  password: string;

  @IsNotEmpty()
  @IsString()
  confirmPassword: string;

  /**
   * Telefono como string: puede tener cero inicial, prefijo internacional
   * (+57) y exceder MAX_SAFE_INTEGER. `number` lo romperia en los tres casos.
   */
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'phone debe contener solo digitos, con prefijo internacional opcional',
  })
  phone: string;

  @IsNotEmpty()
  @IsString()
  documentType: string;

  /**
   * Documento como string: "CC 0123456789" conserva el cero inicial.
   * Como number se perderia y dos documentos distintos podrian colapsar.
   */
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9A-Za-z]{5,20}$/, {
    message: 'documentNumber solo admite letras y digitos, entre 5 y 20 caracteres',
  })
  documentNumber: string;

  @IsNotEmpty()
  @IsDate()
  birthDate: Date;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  gender?: string;

  /** Cine favorito del formulario de registro (HU-006). Sin relacion ni validacion de existencia. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  favoriteCinemaId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cityId?: number;

  @IsBoolean()
  acceptsDataProcessing: boolean;

  @IsBoolean()
  acceptsTerms: boolean;

  @IsBoolean()
  acceptsNotifications: boolean;

  /**
   * `IsIn(enumValues(UserRole))` mantiene el DTO sincronizado con la entidad:
   * agregar un rol al enum lo habilita aqui automaticamente, sin editar dos
   * archivos. El valor por defecto (`usuario`) lo define la entidad, no el
   * cliente: un usuario nunca se auto-asigna admin.
   */
  @IsOptional()
  @IsIn(enumValues(UserRole))
  role?: UserRole;
}
