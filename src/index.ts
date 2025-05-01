import ServerPages from "@entity-access/server-pages/dist/ServerPages.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const server = ServerPages.create();

server.registerRoutes(
    join(dirname(fileURLToPath(import.meta.url)), "./wwwroot/routes"));

