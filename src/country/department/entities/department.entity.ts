import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { City } from "../../city/entities/city.entity.js";

@Entity("departments")
export class Department {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @OneToMany(() => City, (city) => city.department)
    cities: City[]
}
