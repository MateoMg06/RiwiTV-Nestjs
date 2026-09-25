import { IsString, IsBoolean, IsInt, IsNotEmpty } from "class-validator";

export class CreateCountryDto {
    @IsInt()
    id: number
    
    @IsNotEmpty()
    @IsString()
    country: string;

    @IsBoolean()
    isActive: boolean
}