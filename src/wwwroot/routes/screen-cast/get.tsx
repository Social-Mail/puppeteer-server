import Page from "@entity-access/server-pages/dist/Page.js";
import { Query } from "@entity-access/server-pages/dist/core/Query.js";
import { sleep } from "../../../core/sleep.js";
import Content, { TempFileResult } from "@entity-access/server-pages/dist/Content.js";
import Stream from "stream";
import BrowserPage from "../../../core/BrowserPage.js";
import takeFullPageScreenshot from "../../../core/takeFullPageScreenShot.js";
import { CookieData, Protocol } from "puppeteer-core";
import EntityAccessError from "@entity-access/entity-access/dist/common/EntityAccessError.js";
import { JsonLogger } from "../../../core/JsonLogger.js";
import Inject, { ServiceProvider } from "@entity-access/entity-access/dist/di/di.js";
import DiskCacheService from "../../../services/DiskCache.js";

declare let document;
declare let window;

export default class extends Page {

    @Query("url")
    pageUrl: string;

    @Query.asNumber("width")
    pageWidth: number;

    @Query.asNumber("height")
    pageHeight: number;

    @Query("output")
    pageOutput: string;

    @Query("evalScript")
    pageEvalScript: string;

    @Query("stopScript")
    pageStopScript; string;

    @Query.asNumber("timeout")
    pageTimeout: number;

    @Query.asNumber("deviceScaleFactor")
    deviceScaleFactor: number;

    @Query.asBoolean("dumpio")
    dumpio: boolean;

    @Query.asBoolean("fullPage")
    fullPage: boolean;

    @Query.asBoolean
    mobile: boolean;

    @Query.asNumber
    fps: number = 15;

    @Query
    cookies: string;

    @Query.asBoolean
    viewPort: boolean;

    @Query
    userAgent: string;

    @Inject
    private diskCache: DiskCacheService;

    async run() {

        if(!this.pageUrl) {
            throw new EntityAccessError("url not specified");
        }

        try {

            await using page = await BrowserPage.create(this);

            const { cookies } = this;
            if (cookies && cookies !== "undefined" && cookies !== "void 0") {
                try {
                    const parsedCookies = JSON.parse(cookies) as CookieData[];
                    await page.browserContext().setCookie(... parsedCookies);
                } catch (error) {
                    JsonLogger.logError( error, { url: this.pageUrl });
                }
            }

            const timeout = Number(this.pageTimeout || 15000);

            if(this.mobile) {
                const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/70.0.3538.75 Mobile/15E148 Safari/605.1 Mobile-Preview/1.1";
                page.setUserAgent(userAgent);
            } else if (this.userAgent) {
                page.setUserAgent(this.userAgent);
            }

            const fileName = Date.now() + ".webm";
            const tf = await this.diskCache.getTempFile(fileName, "video/webm");

            ServiceProvider.from(this).registerDisposable(tf);

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

            await page.bringToFront();

            await page.goto(this.pageUrl, {
                waitUntil: "networkidle2",
                timeout,
            });

            const { pageStopScript } = this;

            let pageStopScriptExecuted = false;

            if(pageStopScript) {
                try {
                    await page.addScriptTag({
                        type: "module",
                        url: pageStopScript,
                    });
                    pageStopScriptExecuted = true;
                } catch (error) {
                    JsonLogger.logError( error, { url: this.pageUrl });
                }

            }

            const { fps } = this;

            const cast = await page.screencast({
                fps,
                scale: 0.5,
                quality: 40,
                path: tf.path as any
            });

            const { pageEvalScript } = this;
            if (pageEvalScript) {
                await page.evaluate(pageEvalScript);
            }

            if(pageStopScriptExecuted) {
                await page.evaluate("(window.stopPreviewRecording ? window.stopPreviewRecording() : true)");
            } else {
                await sleep(7000);
            }

            await cast.stop();

            if(!tf.contentSize) {
                throw new EntityAccessError("Screen cast failed");
            }

            return new TempFileResult(tf, {
                contentType: "video/webm"
            });
        } catch (error) {
            if(/failed to launch/i.test(error)) {
                process.exit();
            }
            throw error;
        }
    }
}
