import { IsNegative, IsNotEmpty, IsString } from "class-validator";

export class CreateCountryDto {
    @IsString()
    @IsNotEmpty({message: 'El nombre del país no puede estar vacío'})
    country: string;
}
