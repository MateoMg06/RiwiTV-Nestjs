import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity("Departments")
export class Department {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: "boolean" })
    isActive: boolean

    @Column({ type: "varchar" })
    name: string

    @OneToMany("Cities", (city: any) => city.department)
    cities: any[]

    @ManyToOne("Countries", (country: any) => country.departments)
    country: any
}
