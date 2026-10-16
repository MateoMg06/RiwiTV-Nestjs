import { ApiAuth } from './api-auth.decorator.js';
import { MembershipController } from '../../modules/membership/membership.controller.js';
import { NotificationController } from '../../modules/notification/notification.controller.js';
import { ProfileController } from '../../modules/profile/profile.controller.js';
import { ReservationController } from '../../modules/reservation/reservation.controller.js';
import { UserController } from '../../modules/user/user.controller.js';
import { UsersLocationController } from '../../modules/user/users-location.controller.js';
import { AuthController } from '../../modules/auth/auth.controller.js';
import { MovieController } from '../../modules/movie/movie.controller.js';

/** Clave interna de metadatos de @nestjs/swagger para ApiSecurity. */
const API_SECURITY = 'swagger/apiSecurity';

describe('ApiAuth', () => {
  it('documenta Bearer y la cookie accessToken', () => {
    class Protegido {}
    ApiAuth()(Protegido);

    expect(Reflect.getMetadata(API_SECURITY, Protegido)).toEqual([
      { bearer: [] },
      { accessToken: [] },
    ]);
  });

  it.each([
    MembershipController,
    NotificationController,
    ProfileController,
    ReservationController,
    UserController,
    UsersLocationController,
  ])('los controllers protegidos declaran seguridad en Swagger (%o)', (controller) => {
    expect(Reflect.getMetadata(API_SECURITY, controller)).toBeDefined();
  });

  it('los públicos no declaran seguridad a nivel de clase', () => {
    expect(Reflect.getMetadata(API_SECURITY, MovieController)).toBeUndefined();
    expect(Reflect.getMetadata(API_SECURITY, AuthController)).toBeUndefined();
  });
});
