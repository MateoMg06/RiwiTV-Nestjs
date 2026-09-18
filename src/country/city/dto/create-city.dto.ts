import { IsString, IsNotEmpty, IsInt } from "class-validator";

export class CreateCityDto {
    @IsString({message: 'El nombre de la ciudad no puede estar vacío'})
    city: string;

    @IsNotEmpty()
    @IsInt()
    countryId: number

    @IsNotEmpty()
    @IsInt()
    DepartmentId: number
    
}

