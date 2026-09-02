/* eslint-disable no-console */
import { RegisterSingleton } from "@entity-access/entity-access/dist/di/di.js";
import { join } from "path";
import { randomUUID } from "crypto";
import BaseDiskCache from "@entity-access/server-pages/dist/cache/BaseDiskCache.js";

const cacheRoot = process.env.TMP_PATH || "/tmp/puppeteer-server/tmp";
@RegisterSingleton
export default class DiskCacheService {

    private tmp: BaseDiskCache;

    constructor() {

        this.tmp = new BaseDiskCache({
            root: join(cacheRoot, "tmp"),
            keepTTLSeconds: 60*60,
            maxAge: 1
        });
    }

    public getTempFile(name, ct) {
        return this.tmp.createTempFileDeleteOnExit([randomUUID(), name], name, ct);
    }

}
