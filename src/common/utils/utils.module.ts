import { Global, Module } from '@nestjs/common';
import { Bcrypt } from './bcrypt.js';
import { Captcha } from './captcha.js';
import { Jwt } from './jwt.js';
import { Logger } from './logger.js';
import { TokenExpiry } from './token-expiry.js';

@Global()
@Module({
  providers: [Jwt, Captcha, Bcrypt, TokenExpiry, Logger],
  exports: [Jwt, Captcha, Bcrypt, TokenExpiry, Logger],
})
export class UtilsModule {}

export { UtilsModule as utilsModule };
export default UtilsModule;
