import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ShowtimeService } from './showtime.service.js';
import type { ShowtimeDao } from './showtime.dao.js';
import type { Showtime } from './showtime.entity.js';
import {
  AgeRating,
  AudioType,
  ShowFormat,
  ShowtimeStatus,
} from '../../common/enums/domain.enums.js';

const startsAt = new Date('2026-10-20T20:00:00Z');

const makeShowtime = (overrides: Partial<Showtime> = {}) =>
  ({
    id: 5,
    startsAt,
    format: ShowFormat.IMAX,
    language: 'Español',
    roomType: 'VIP',
    audioType: AudioType.DUBBED,
    status: ShowtimeStatus.ACTIVE,
    price: '24000.00',
    cinema: { id: 2, name: 'Multicine Riwi Centro', isActive: true },
    movie: {
      id: 9,
      name: 'Noche en Medellín',
      duration: 120,
      classification: AgeRating.DOCE,
      posterUrl: 'https://img/p.jpg',
      synopsis: 'no debe salir',
    },
    ...overrides,
  }) as unknown as Showtime;

function setup(result: Showtime | null) {
  const findSelectableById = vi.fn().mockResolvedValue(result);
  const service = new ShowtimeService({ findSelectableById } as unknown as ShowtimeDao);
  return { findSelectableById, service };
}

describe('ShowtimeService.getById (HU-009)', () => {
  it('devuelve la función con price numérico, cine y película resumida', async () => {
    const { findSelectableById, service } = setup(makeShowtime());

    await expect(service.getById(5)).resolves.toEqual({
      id: 5,
      startsAt,
      format: ShowFormat.IMAX,
      language: 'Español',
      roomType: 'VIP',
      audioType: AudioType.DUBBED,
      status: ShowtimeStatus.ACTIVE,
      price: 24000,
      cinema: { id: 2, name: 'Multicine Riwi Centro' },
      movie: {
        id: 9,
        name: 'Noche en Medellín',
        duration: 120,
        classification: AgeRating.DOCE,
        posterUrl: 'https://img/p.jpg',
      },
    });
    expect(findSelectableById).toHaveBeenCalledWith(5);
  });

  it('lanza 404 «Función no encontrada» si no hay función seleccionable', async () => {
    const { service } = setup(null);

    const error = await service.getById(404).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).message).toBe('Función no encontrada');
  });

  it('una función SOLD_OUT responde con su status', async () => {
    const { service } = setup(makeShowtime({ status: ShowtimeStatus.SOLD_OUT }));

    await expect(service.getById(5)).resolves.toMatchObject({ status: ShowtimeStatus.SOLD_OUT });
  });
});

describe('ShowtimeService.getPrices (HU-009)', () => {
  it('devuelve solo el precio de lista con la forma del contrato', async () => {
    const { findSelectableById, service } = setup(makeShowtime());

    await expect(service.getPrices(5)).resolves.toEqual({
      functionId: 5,
      format: ShowFormat.IMAX,
      roomType: 'VIP',
      startsAt,
      status: ShowtimeStatus.ACTIVE,
      price: 24000,
    });
    expect(findSelectableById).toHaveBeenCalledWith(5);
  });

  it('lanza 404 «Función no encontrada» si no hay función seleccionable', async () => {
    const { service } = setup(null);

    const error = await service.getPrices(404).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).message).toBe('Función no encontrada');
  });

  it('el precio sigue a cada función: formato, sala y hora (RN-037)', async () => {
    const otherStart = new Date('2026-10-21T23:30:00Z');
    const a = setup(
      makeShowtime({ price: '14000.00', format: ShowFormat.DOS_D, roomType: 'STANDARD' }),
    );
    const b = setup(
      makeShowtime({
        id: 6,
        price: '17500.50',
        format: ShowFormat.TRES_D,
        roomType: 'VIP',
        startsAt: otherStart,
      }),
    );

    await expect(a.service.getPrices(5)).resolves.toMatchObject({
      format: ShowFormat.DOS_D,
      roomType: 'STANDARD',
      price: 14000,
    });
    await expect(b.service.getPrices(6)).resolves.toMatchObject({
      functionId: 6,
      format: ShowFormat.TRES_D,
      roomType: 'VIP',
      startsAt: otherStart,
      price: 17500.5,
    });
  });

  it('una función SOLD_OUT responde con su status', async () => {
    const { service } = setup(makeShowtime({ status: ShowtimeStatus.SOLD_OUT }));

    await expect(service.getPrices(5)).resolves.toMatchObject({ status: ShowtimeStatus.SOLD_OUT });
  });
});
