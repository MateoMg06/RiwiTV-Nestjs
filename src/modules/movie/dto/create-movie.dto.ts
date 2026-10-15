import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from "class-validator";

export class CreateMovieDto {
    @ApiProperty({ example: "Spiderman" })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    name: string;

    @ApiProperty({ example: "PG-13" })
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    clasification: string;

    @ApiProperty({ example: 120, description: "Duración en minutos" })
    @IsInt()
    @IsPositive()
    duration: number;

    @ApiProperty({ example: "Acción" })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    gener: string;
}
