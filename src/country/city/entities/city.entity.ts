import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import type { Country } from "../../entities/country.entity.js";
import type { Department } from "../../department/entities/department.entity.js";

@Entity("Cities")
export class City {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @ManyToOne("Country")
    country: Country

    @ManyToOne("Department", (department: Department) => department.cities)
    department: Department
}