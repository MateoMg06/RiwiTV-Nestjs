import * as fs from "fs";
import { parse } from "dotenv";

export class ConfigService {
    private readonly envConfig: { [key: string]: string };

    constructor() {
        const isDev: boolean = process.env.NODE_ENV !== "production";

        if (isDev) {
            const envFilePath = __dirname + "/../../.env";
            const existsPath = fs.existsSync(envFilePath);

            if (!existsPath) {
                console.log(".env no encontrado");
                process.exit(0);
            }

            this.envConfig = parse(fs.readFileSync(envFilePath));
        } else {
            this.envConfig = {};
        }

        // Las variables ya presentes en process.env tienen prioridad sobre el
        // contenido del archivo .env (común en Docker/CI/produccion).
        for (const [key, value] of Object.entries(process.env)) {
            if (value !== undefined) {
                this.envConfig[key] = value;
            }
        }
    }

    get(key: string): string {
        return this.envConfig[key];
    }

    getOrThrow(key: string): string {
        const value = this.get(key);

        if (!value) {
            throw new Error(`ConfigService: falta la variable de entorno "${key}"`);
        }

        return value;
    }
}
