import { IsBoolean, IsNumber, IsString } from "class-validator";

export class CreateCityDto {
    @IsNumber()
    id: number

    @IsString()
    city: string;

    @IsBoolean()
    isActive: boolean
}