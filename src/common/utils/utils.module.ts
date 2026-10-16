import { Global, Module } from '@nestjs/common';
import { Bcrypt } from './bcrypt.js';
import { Captcha } from './captcha.js';
import { Jwt } from './jwt.js';
import { Logger } from './logger.js';
import { TokenExpiry } from './token-expiry.js';
import { Password } from './password.js';
import { MailService } from './mail.js';
import { ConfigModule } from '../../config/config.module.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [Jwt, Captcha, Bcrypt, TokenExpiry, Logger, Password, MailService],
  exports: [Jwt, Captcha, Bcrypt, TokenExpiry, Logger, Password, MailService],
})
export class UtilsModule {}

export { UtilsModule as utilsModule };
export default UtilsModule;
