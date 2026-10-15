import { NotFoundException } from '@nestjs/common';
import { MovieService } from './movie.service.js';
import { MovieDao } from './movie.dao.js';
import { Movie } from './movie.entity.js';

const movie: Movie = {
  id: 1,
  name: 'Spiderman',
  clasification: 'PG-13',
  duration: 120,
  gener: 'Acción',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const dto = {
  id: 1,
  name: 'Spiderman',
  clasification: 'PG-13',
  duration: 120,
  gener: 'Acción',
};

describe('MovieService', () => {
  let dao: Record<keyof MovieDao, ReturnType<typeof vi.fn>>;
  let service: MovieService;

  beforeEach(() => {
    dao = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      findByName: vi.fn(),
      findCinemasByMovieId: vi.fn(),
    };
    service = new MovieService(dao as unknown as MovieDao);
  });

  it('crea una película y devuelve el DTO sin timestamps', async () => {
    dao.create.mockResolvedValue(movie);
    const { id: _id, ...body } = dto;

    await expect(service.create(body)).resolves.toEqual(dto);
    expect(dao.create).toHaveBeenCalledWith(body);
  });

  it('devuelve la cartelera completa', async () => {
    dao.findAll.mockResolvedValue([movie]);

    await expect(service.getCatalog()).resolves.toEqual([dto]);
  });

  it('busca una película por nombre', async () => {
    dao.findByName.mockResolvedValue(movie);

    await expect(service.getByName('Spiderman')).resolves.toEqual(dto);
  });

  it('lanza 404 si la película no existe por nombre', async () => {
    dao.findByName.mockResolvedValue(null);

    await expect(service.getByName('Nada')).rejects.toThrow(NotFoundException);
  });

  it('devuelve los cines de una película existente', async () => {
    const cinemas = [{ id: 3, name: 'Cine Centro' }];
    dao.findById.mockResolvedValue(movie);
    dao.findCinemasByMovieId.mockResolvedValue(cinemas);

    await expect(service.getMovieCinemas(1)).resolves.toEqual(cinemas);
    expect(dao.findCinemasByMovieId).toHaveBeenCalledWith(1);
  });

  it('lanza 404 al pedir cines de una película inexistente', async () => {
    dao.findById.mockResolvedValue(null);

    await expect(service.getMovieCinemas(99)).rejects.toThrow(NotFoundException);
    expect(dao.findCinemasByMovieId).not.toHaveBeenCalled();
  });
});
