import { IsString, IsNumber, IsBoolean } from "class-validator";

export class CreateCountryDto {
    @IsNumber()
    id: number
    
    @IsString()
    country: string;

    @IsBoolean()
    isActive: boolean
}