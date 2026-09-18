import { CreateCityDto } from "../dto/create-city.dto.js";
import { City } from "../../city/entities/city.entity.js";
//import { Department } from "../entities/department.entity.js";




export interface ICityService {

 
  findAll(): Promise<City[]>;

  findOne(id: number): Promise<City | null>;

  //getCity(departmentId: number): Promise<City[]>;

  create(dto: CreateCityDto): Promise<City>;

  remove(id: number): Promise<void>;
}