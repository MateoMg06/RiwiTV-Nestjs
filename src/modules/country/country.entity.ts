import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity("Countries")
export class Country {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: "boolean" })
    isActive: boolean

    @Column({ type: "varchar" })
    name: string

    @OneToMany("Cities", (city: any) => city.country)
    cities: any[]

    @OneToMany("Departments", (department: any) => department.country)
    departments: any[]
}
