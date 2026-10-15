import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * Los nombres `clasification` y `gener` se conservan del proyecto original
 * (RIWI-TV-PUBLIC) para no romper el contrato con el frontend.
 */
@Entity("Movies")
export class Movie {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ length: 100 })
    name: string

    @Column({ length: 50 })
    clasification: string

    @Column({ type: "int" })
    duration: number

    @Column({ length: 100 })
    gener: string

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
