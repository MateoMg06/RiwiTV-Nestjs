import { IsBoolean, IsInt, IsNotEmpty, IsString } from "class-validator";

export class CreateCityDto {
    @IsInt()
    id: number

    @IsNotEmpty()
    @IsString()
    city: string;

    @IsBoolean()
    isActive: boolean
}