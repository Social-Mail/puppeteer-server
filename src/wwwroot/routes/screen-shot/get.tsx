import Page from "@entity-access/server-pages/dist/Page.js";
import { Query } from "@entity-access/server-pages/dist/core/Query.js";
import { sleep } from "../../../core/sleept.js";
import Content from "@entity-access/server-pages/dist/Content.js";
import Stream from "stream";
import BrowserPage from "../../../core/BrowserPage.js";
import takeFullPageScreenshot from "../../../core/takeFullPageScreenShot.js";

export default class extends Page {

    @Query("url")
    pageUrl: string;

    @Query.asNumber("width")
    pageWidth: number;

    @Query.asNumber("height")
    pageHeight: number;

    @Query("output")
    pageOutput: string;

    @Query("test")
    pageTest: string;

    @Query("testDelay")
    pageTestDelay: string;

    @Query.asNumber("timeout")
    pageTimeout: number;

    @Query.asNumber("deviceScaleFactor")
    deviceScaleFactor: number;

    @Query.asBoolean("dumpio")
    dumpio: boolean;

    @Query.asBoolean
    mobile: boolean;

    @Query.asBoolean
    viewPort: boolean;

    @Query
    userAgent: string;

    async run() {

        await using page = await BrowserPage.create(this);

        const timeout = Number(this.pageTimeout || 15000);

        const test = this.pageTest || "true";

        const testDelay = Number(this.pageTestDelay || 1000);

        if(this.mobile) {
            const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/70.0.3538.75 Mobile/15E148 Safari/605.1 Mobile-Preview/1.1";
            page.setUserAgent(userAgent);
        } else if (this.userAgent) {
            page.setUserAgent(this.userAgent);
        }

        await page.goto(this.pageUrl, {
            waitUntil: "networkidle2",
            timeout,
        });

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

        if (this.viewPort) {
            if (this.mobile) {
                this.deviceScaleFactor ??= 2;
            }
            const {
                pageWidth: width,
                pageHeight: height,
                deviceScaleFactor = this.mobile ? 2 : 1
            } = this;
            page.setViewport({
                width,
                height,
                deviceScaleFactor
            });
        }

        switch(output) {
            case "webp":
                contentType = "image/webp";
                outputBuffer =
                    await takeFullPageScreenshot(page, output);
                break;
            case "png":
                contentType = "image/png";
                outputBuffer = await takeFullPageScreenshot(page, output);
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
