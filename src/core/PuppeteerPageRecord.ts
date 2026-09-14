import { LocalFile } from "@entity-access/server-pages/dist/core/LocalFile.js";
import { Page } from "puppeteer-core";
import { newID } from "./newID.js";
import { spawnPromise } from "./spawnPromise.js";
import { unlink } from "node:fs/promises";

interface VideoRecorderOptions {
  page: Page;
  outputFile: string;
  fps?: number;
  scale?: number;
}

export default class PuppeteerPageRecord {
    page: Page;
    outputFile: string;
    scale: number;
    recorder: any;
    fps: number;
    tmpFile: string;
    

    constructor(options: VideoRecorderOptions) {
        this.page = options.page;
        this.outputFile = options.outputFile;
        this.scale = options.scale ?? 1;
        this.fps = options.fps;
        this.tmpFile = this.outputFile + ".webm"; 
    }

    async start() {

        this.recorder = await this.page.record({
            audio: false,
            fps: this.fps,
            overwrite: true,
            path: this.tmpFile
        });

    }

    async stop() {
        // convert using ffmpeg...
        await spawnPromise("ffmpeg", [
            "-i", this.tmpFile,
            "-vf", "scale=iw*0.5:ih*0.5",
            "-y",
            this.outputFile
        ]);

        try {
            await unlink(this.tmpFile);
        } catch {

        }
    }

}