import { IsBoolean, IsDate, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateUserDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    lastName: string;

    @IsEmail()
    email: string;

    @IsEmail()
    confirmEmail: string;

    @IsNotEmpty()
    @IsString()
    password: string;

    @IsNotEmpty()
    @IsString()
    confirmPassword: string;

    @IsNumber()
    phone: number;

    @IsNotEmpty()
    @IsString()
    documentType: string;

    @IsNumber()
    documentNumber: number;

    @IsDate()
    birthDate: Date | null;

    @IsNotEmpty()
    @IsString()
    city: string;

    @IsBoolean()
    acceptsDataProcessing: boolean;

    @IsBoolean()
    acceptsTerms: boolean;

    @IsBoolean()
    acceptsNotifications: boolean;

    @IsOptional()
    @IsString()
    role?: "admin" | "usuario";
}