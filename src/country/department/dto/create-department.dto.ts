import { IsInt, IsNotEmpty, IsString } from "class-validator";

export class CreateDepartmentDto {

    @IsNotEmpty({message: 'El nombre del departamento no puede estar vacío'})
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsInt()
    countryId: number
}