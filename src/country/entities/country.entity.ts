import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { City } from "../city/entities/city.entity.js";
import { Department } from "../department/entities/department.entity.js";

@Entity("Countries")
export class Country {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @OneToMany(() => City, (city) => city.country)
    cities: City[]

    @OneToMany(() => Department, (department) => department.country)
    departments: Department[]
}
