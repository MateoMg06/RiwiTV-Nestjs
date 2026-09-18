import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import type { City } from "../city/entities/city.entity.js";
import type { Department } from "../department/entities/department.entity.js";

@Entity("Countries")
export class Country {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @OneToMany("City", (city: City) => city.country)
    cities: City[]

    @OneToMany("Department", (department: Department) => department.country)
    departments: Department[]
}
