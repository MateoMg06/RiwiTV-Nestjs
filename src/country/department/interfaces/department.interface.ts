import { CreateDepartmentDto } from "../dto/create-department.dto.js";
import { City } from "../../city/entities/city.entity.js";
import { Department } from "../entities/department.entity.js";




export interface IDepartmentService {

 
  findAll(): Promise<Department[]>;

  findOne(id: number): Promise<Department | null>;

  getCity(departmentId: number): Promise<City[]>;

  create(dto: CreateDepartmentDto): Promise<Department>;

  remove(id: number): Promise<void>;
}