import { IsBoolean, IsNumber, IsString } from "class-validator";

export class CreateDepartmentDto {
    @IsNumber()
    id: number

    @IsString()
    department: string;

    @IsBoolean()
    isActive: boolean
}