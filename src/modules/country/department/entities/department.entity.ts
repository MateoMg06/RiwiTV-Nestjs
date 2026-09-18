import { Column, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { City } from "../../city/entities/city.entity.js";
import { Country } from "../../entities/country.entity.js";

@Entity("Countries")
export class Department {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    isActive: boolean

    @Column()
    name: string

    @OneToMany(() => City, (city) => city.department)
    cities: City[]

    @ManyToOne(() => Country, (country) => country.departments)
    country: string
}
