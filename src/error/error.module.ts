import { Global, Module } from "@nestjs/common";
import ErrorHandler from "./errorHandler.js";

@Global()
@Module({
    providers: [ErrorHandler],
    exports: [ErrorHandler]
})
export class ErrorModule {}