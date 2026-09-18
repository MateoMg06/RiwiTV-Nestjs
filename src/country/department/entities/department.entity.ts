import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import type { City } from "../../city/entities/city.entity.js";
import type { Country } from "../../entities/country.entity.js";

@Entity("Departments")
export class Department {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string
    
    @OneToMany("City", (city: City) => city.department)
    cities: City[]

    @ManyToOne("Country", (country: Country) => country.departments)
    country: Country
}
