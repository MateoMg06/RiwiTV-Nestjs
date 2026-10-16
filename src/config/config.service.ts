export class ConfigService {
    private readonly envConfig: { [key: string]: string } = {};

    constructor() {
        // El .env ya esta en process.env: lo carga (y lo exige)
        // `config/load-env.ts`, importado al inicio de main.ts.
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
