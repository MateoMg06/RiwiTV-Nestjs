import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { City } from '../country/city/city.entity.js';

/** Cine (complejo). Mínimo para RN-006: una ciudad solo es elegible si tiene un cine activo. */
@Entity('Cinemas')
export class Cinema {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => City, { nullable: false })
  city: City;
}
