import { Injectable } from "@nestjs/common";

@Injectable()
export class Password {
    async validatePassword(password: string){
        if (typeof password !== 'string'){
            return false
        }
        const hasMinLength = password.length >= 10;
        const hasDigit = /[0-9]/.test(password);
        const hasLowercase = /\p{Ll}/u.test(password);
        const hasUppercase = /\p{Lu}/u.test(password);
        const hasSpecialChar = /[\p{P}\p{S}]/u.test(password);

        return hasMinLength && hasDigit && hasLowercase && hasUppercase && hasSpecialChar;
    }
}
