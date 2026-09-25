import * as fs from "fs"
import {parse} from "dotenv"

export class ConfigService {
    private readonly envConfig: {[key: string]: string}

    constructor() {
        const isDev: boolean= process.env.NODE_ENV!== "production";

        if(isDev){
            const envFilePath= __dirname + "/../../.env"
            const existsPath= fs.existsSync(envFilePath)

            if(!existsPath){
                console.log(".env no encontrado")
                process.exit(0)
            }
            this.envConfig= parse(fs.readFileSync(envFilePath))
        }
        this.envConfig= {
            PORT: String(process.env.APP_PORT)
        }
    }
    get(key: string): string{
        return this.envConfig[key]
    }
}