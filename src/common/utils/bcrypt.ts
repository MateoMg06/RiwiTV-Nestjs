import { Injectable } from '@nestjs/common'
import bcrypt from 'bcryptjs'

@Injectable()
export class Bcrypt {
    hashPassword(password: string, saltRounds: number){
        return bcrypt.hash(password, saltRounds)
    }

    comparePassword(rawPassword: string, hashedPassword: string){
        return bcrypt.compare(rawPassword, hashedPassword)
    }
}