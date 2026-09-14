import { IsString } from "class-validator";

export class CreateCityDto {
    @IsString()
    city: string;
}