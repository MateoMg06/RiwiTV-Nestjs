import { IsBoolean, IsString, IsInt, IsNotEmpty } from "class-validator";

export class CreateDepartmentDto {
    @IsInt()
    id: number

    @IsNotEmpty()
    @IsString()
    department: string;

    @IsBoolean()
    isActive: boolean
}