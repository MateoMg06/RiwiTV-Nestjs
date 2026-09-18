import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { City } from "../../city/entities/city.entity.js";
import { Country } from "../../entities/country.entity.js";

@Entity("Departments")
export class Department {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string
    

    @OneToMany(() => City, (city) => city.department)
    cities: City[]

    @ManyToOne(() => Country, (country) => country.departments)
    country: Country
    
}


