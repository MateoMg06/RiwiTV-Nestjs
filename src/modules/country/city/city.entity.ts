import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Country } from "../country.entity.js";
import { Department } from "../department/department.entity.js";

@Entity("Cities")
export class City {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    isActive: boolean

    @Column()
    name: string

    @ManyToOne(() => Country)
    country: Country

    @ManyToOne(() => Department, (department) => department.cities)
    department: Department
}