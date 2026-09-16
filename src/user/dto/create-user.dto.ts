import { IsBoolean, isBoolean, IsDate, IsEmail, IsNumber, IsString } from "class-validator";
import { Entity } from "typeorm";

@Entity("user")
export class CreateUserDto {
    @IsString()
    name: string;
    @IsString()
    lastName: string;
    @IsEmail()
    email: string;
    @IsEmail()
    confirmEmail: string;
    @IsString()
    password: string;
    @IsString()
    confirmPassword: string;
    @IsNumber()
    phone: number;
    @IsString()
    documentType: string;
    @IsNumber()
    documentNumber: number;
    @IsDate()
    birthDate: Date | null;
    @IsString()
    city: string;
    @IsBoolean()
    acceptsDataProcessing: boolean;
    @IsBoolean()
    acceptsTerms: boolean;
    @IsBoolean()
    acceptsNotifications: boolean;
    @IsString()
    role?: string;
}
