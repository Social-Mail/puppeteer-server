import ServerPages from "@entity-access/server-pages/dist/ServerPages.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const server = ServerPages.create();

server.registerRoutes(
    join(dirname(fileURLToPath(import.meta.url)), "./wwwroot/routes"));


server.build({
    createSocketService: false,
    host: process.env.HOST,
    port: Number(process.env.PORT || "8080"),
    protocol: "http",
    trustProxy: false,
    acmeOptions: null,
    allowHTTP1: true,
}).catch(console.error);