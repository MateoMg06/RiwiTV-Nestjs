import { CreateCountryDto } from "../dto/create-country.dto.js";
import { Country } from "../entities/country.entity.js";
import { Department } from "../department/entities/department.entity.js";


export interface ICountryService {

 
  findAll(): Promise<Country[]>;

  findOne(id: number): Promise<Country | null>;

  getDepartments(countryId: number): Promise<Department[]>;

  create(dto: CreateCountryDto): Promise<Country>;

  remove(id: number): Promise<void>;
}