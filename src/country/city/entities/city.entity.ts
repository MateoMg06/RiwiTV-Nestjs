import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Country } from "../../entities/country.entity.js";
import { Department } from "../../department/entities/department.entity.js";

@Entity("Cities")
export class City {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => Country)
    country: Country

    @ManyToOne(() => Department, (department) => department.cities)
    department: Department
}