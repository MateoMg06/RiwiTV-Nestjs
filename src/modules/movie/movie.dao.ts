import { Injectable, NotImplementedException } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { CreateMovieDto } from "./dto/create-movie.dto.js";
import { Movie } from "./movie.entity.js";

@Injectable()
export class MovieDao {
    constructor(private readonly dataSource: DataSource){}

    private get repo(): Repository<Movie>{
        return this.dataSource.getRepository(Movie)
    }

    create(dto: CreateMovieDto): Promise<Movie>{
        return this.repo.save(this.repo.create(dto))
    }

    findAll(): Promise<Movie[]>{
        return this.repo.find({ order: { id: "ASC" } })
    }

    findById(id: number): Promise<Movie | null>{
        return this.repo.findOne({ where: { id } })
    }

    findByName(name: string): Promise<Movie | null>{
        return this.repo.findOne({ where: { name } })
    }

    /**
     * Cines donde se proyecta la película (a través de Showtime).
     *
     * Las entidades Cinema y Showtime pertenecen al CinemaModule. Se referencian
     * por nombre para no acoplar este módulo a sus archivos; el contrato acordado
     * es que Showtime tenga las propiedades `cinemaId` y `movieId`.
     */
    findCinemasByMovieId(movieId: number): Promise<object[]>{
        if (!this.dataSource.hasMetadata("Cinema") || !this.dataSource.hasMetadata("Showtime")) {
            throw new NotImplementedException("El módulo de cines todavía no está disponible")
        }

        return this.dataSource
            .getRepository("Cinema")
            .createQueryBuilder("cinema")
            .innerJoin("Showtime", "showtime", "showtime.cinemaId = cinema.id")
            .where("showtime.movieId = :movieId", { movieId })
            .distinct(true)
            .getMany()
    }
}
