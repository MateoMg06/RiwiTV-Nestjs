import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { City } from "../../country/city/entities/city.entity.js";
import { Admin } from "typeorm/driver/mongodb/typings.js";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column()
    lastname: string

    @Column()
    email: string

    @Column()
    password: string

    @Column()
    role: "admin" | "usuario" 

    @Column()
    membership: string

    @Column()
    failedLoginAttempts: number

    @Column()
    lastLoginAttempt: Date | null

    @Column()
    lockedUntil: Date | null

    @Column()
    phone: string

    @Column()
    documentType: string

    @Column()
    documentNumber: string

    @Column()
    birthDate: Date

    @Column()
    cityname: string

    @Column()
    acceptsDataProcessing: boolean;

    @Column()
    acceptsTerms: boolean;

    @Column()
    acceptsNotifications: boolean;

    @Column()    
    accountStatus: 'active' | 'inactive';

    @Column()
    activationToken: string | null;

    @Column()
    activationTokenExpires: Date | null;

    @Column()
    accessToken: string | null;

    @Column()
    refreshToken: string | null;

    @Column()
    resetToken: string | null;

    @Column()
    resetTokenExpires: Date | null;

    @Column()
    cityId: number | null;


    @ManyToOne(() => City)
    city: City



}
