import Inject from "@entity-access/entity-access/dist/di/di.js";
import { TempFileResult } from "@entity-access/server-pages/dist/Content.js";
import { LocalFile } from "@entity-access/server-pages/dist/core/LocalFile.js";
import { Query } from "@entity-access/server-pages/dist/core/Query.js";
import Page from "@entity-access/server-pages/dist/Page.js";
import { parse } from "path";
import { Readable } from "stream";
import debugLog from "../debugLog.js";
import DiskCacheService from "../../services/DiskCache.js";
import { CORS } from "../CORS.js";
import { Prepare } from "@entity-access/server-pages/dist/decorators/Prepare.js";

export interface IConvertParams {
    input: LocalFile;
    output: LocalFile;
    fileName: string;
    senderDomain: string;
    args: string[];
}

@Prepare.parseForm
export default abstract class BaseConverterPage extends Page {

    abstract convert(p:IConvertParams): Promise<LocalFile>; 

    @Query
    senderDomain: string;

    @Query
    sourceUrl: string;

    @Query
    args: string;

    @Inject
    diskCache: DiskCacheService;

    async run() {

        console.log(`HTTP-in: ${this.request.url}`);

        const fileName = this.childPath[this.childPath.length-1];
        const { senderDomain } = this;

        let input = null as LocalFile;

        if (this.sourceUrl) {
            const u = new URL(this.sourceUrl);
            const { base } = parse(u.pathname);
            const input = await this.diskCache.getTempFile(base);
            const rs = await fetch(this.sourceUrl);
            await input.writeAll(Readable.fromWeb(rs.body as any));
        } else {
            input = this.form.files[0]
            // input = new LocalFile(this.filePath, void 0, void 0, () => void 0);
        }

        debugLog?.(`Converting file ${input.path}`);

        const output = await this.diskCache.getTempFile(fileName);

        const args = JSON.parse(this.args || "[]");

        const file = await this.convert({ input, fileName, senderDomain, output, args });

        
        debugLog?.(`File ${input} converted`);
        

        this.registerDisposable(file);

        debugLog?.(`Sending ${file.path}`);

        return new TempFileResult(
            file, {
                contentDisposition: "inline",
                immutable: true,
                etag: false,
                headers: CORS.allowAll
            },
        );
    }
} 