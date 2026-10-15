import { ApiProperty } from "@nestjs/swagger";

/**
 * Forma en la que se expone una película en la cartelera.
 */
export class GetMovieCatalogDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: "Spiderman" })
    name: string;

    @ApiProperty({ example: "PG-13" })
    clasification: string;

    @ApiProperty({ example: 120 })
    duration: number;

    @ApiProperty({ example: "Acción" })
    gener: string;
}
