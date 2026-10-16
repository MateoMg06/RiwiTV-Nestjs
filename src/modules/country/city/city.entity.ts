import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity("Cities")
export class City {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: "boolean" })
    isActive: boolean

    @Column({ type: "varchar" })
    name: string

    @ManyToOne("Countries")
    country: any

    @ManyToOne("Departments", (department: any) => department.cities)
    department: any
}
