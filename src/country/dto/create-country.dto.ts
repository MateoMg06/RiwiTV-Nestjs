import { IsNotEmpty, IsString } from "class-validator";

export class CreateCountryDto {
    @IsString()
    @IsNotEmpty({message: 'El nombre del país no puede estar vacío'})
    name: string;
}
