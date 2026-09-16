import { IsString, IsBoolean, IsInt } from "class-validator";

export class CreateCountryDto {
    @IsInt()
    id: number
    
    @IsString()
    country: string;

    @IsBoolean()
    isActive: boolean
}