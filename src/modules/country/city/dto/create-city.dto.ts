import { IsBoolean, IsInt, IsString } from "class-validator";

export class CreateCityDto {
    @IsInt()
    id: number

    @IsString()
    city: string;

    @IsBoolean()
    isActive: boolean
}