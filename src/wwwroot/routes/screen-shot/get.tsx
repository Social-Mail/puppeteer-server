import DateTime from "@entity-access/entity-access/dist/types/DateTime.js";
import Page from "@entity-access/server-pages/dist/Page.js";
import { Query } from "@entity-access/server-pages/dist/core/Query.js";
import puppeteer from 'puppeteer-core'
import { sleep } from "../../../core/sleept.js";
import Content from "@entity-access/server-pages/dist/Content.js";
import Stream from "stream";
import { PuppeteerPath } from "../../../core/PuppeteerPath.js";

const { executablePath } = PuppeteerPath;

export default class extends Page {

    @Query("url")
    pageUrl: string;

    @Query("width")
    pageWidth: string;

    @Query("height")
    pageHeight: string;

    @Query("output")
    pageOutput: string;

    @Query("test")
    pageTest: string;

    @Query("testDelay")
    pageTestDelay: string;

    @Query("timeout")
    pageTimeout: string;

    async run() {

        const browser = await puppeteer.launch({
            executablePath,
            channel: "chrome"
        });
        const page = await browser.newPage();

        const width = Number(this.pageWidth || 1024);
        const height = Number(this.pageHeight || 1024);

        const timeout = Number(this.pageTimeout || 15000);

        const test = this.pageTest || "true";

        const testDelay = Number(this.pageTestDelay || 1000);

        await page.setViewport({ width, height });

        await page.goto(this.pageUrl, { waitUntil: "domcontentloaded" });

        let now = Date.now();
        const end = now + timeout;

        while(now < end) {
            await sleep(testDelay);

            const isTrue = (await page.evaluate(test)) as any;
            if (/true/i.test(isTrue)) {
                break;
            }
        }

        const output = this.pageOutput?.toLowerCase() || "webp"

        let outputBuffer: Uint8Array;
        let contentType: any;

        switch(output) {
            case "webp":
                contentType = "image/webp";
                outputBuffer = await page.screenshot({
                    type: output
                });
                break;
            case "png":
                contentType = "image/png";
                outputBuffer = await page.screenshot({
                    type: output
                });
                break;
            case "pdf":
                contentType = "application/pdf";
                outputBuffer = await page.pdf({});
                break;
            default:
                throw new Error(`Output type ${output} not supported`);
        }

        return Content.readable(Stream.Readable.from([outputBuffer]), {
            status: 200,
            headers: {
                "content-type": contentType
            }
        });
    }
}
