import { IsBoolean, IsString, IsInt } from "class-validator";

export class CreateDepartmentDto {
    @IsInt()
    id: number

    @IsString()
    department: string;

    @IsBoolean()
    isActive: boolean
}