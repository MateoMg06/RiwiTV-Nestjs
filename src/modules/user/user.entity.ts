import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { City } from "../country/city/city.entity.js";

@Entity("Users")
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    lastName: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column()
    phone: number;

    @Column()
    documentType: string;

    @Column({ unique: true })
    documentNumber: number;

    @Column({ type: "date" })
    birthDate: Date;

    @ManyToOne(() => City)
    @JoinColumn({ name: "cityId" })
    city: City;

    @Column({ default: false })
    acceptsDataProcessing: boolean;

    @Column({ default: false })
    acceptsTerms: boolean;

    @Column({ default: false })
    acceptsNotifications: boolean;

    @Column({ default: "usuario" })
    role: "admin" | "usuario";
}