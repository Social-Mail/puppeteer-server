import DateTime from "@entity-access/entity-access/dist/types/DateTime.js";
import { Query } from "@entity-access/server-pages/dist/core/Query.js";
import puppeteer from 'puppeteer-core'
import { Agent, fetch } from "undici";
import { connect } from "net";
import { PuppeteerPath } from "./PuppeteerPath.js";
import { defaultArgs } from "./defaultArgs.js";
import { FetchInterceptor } from "./FetchInterceptor.js";
import { Page } from "puppeteer-core";
import { JsonLogger } from "./JsonLogger.js";

const { executablePath } = PuppeteerPath;


export default class BrowserPage {

    static async create({
        pageWidth,
        pageHeight,
        dumpio = false,
        deviceScaleFactor = 1,
        timezone= void 0,
        pageOutput
    }): Promise<Page & AsyncDisposable> {

        const env = { ... process.env };
        if(timezone) {
            env.TZ = timezone;
            JsonLogger.log({
                timezone
            })
        }
        
        const browser = await puppeteer.launch({
            headless: true,
            executablePath,
            acceptInsecureCerts: true,
            args: [... defaultArgs],
            dumpio,
            env
        });

        const page = await browser.newPage();
        
        const width = Number(pageWidth || 1024);
        const height = Number(pageHeight || 1024);
        deviceScaleFactor = Number(deviceScaleFactor);
        await page.setViewport({ width, height, deviceScaleFactor });

        await FetchInterceptor.intercept(page, pageOutput);

        page.on('console', async (message) => {
            if (message.text() != "JSHandle@error") {
                // console.log(`${message.type().substring(0, 3).toUpperCase()} ${message.text()}`);
                JsonLogger.logError({
                    url: page.url(),
                    type: message.type().substring(0, 3).toUpperCase(),
                    error: message.text(),
                })
                return;
            }
            const messages = await Promise.all(message.args().map((arg) => {
                return arg.getProperty("message");
            }));
            
            // console.log(`${message.type().substring(0, 3).toUpperCase()} ${messages.filter(Boolean)}`);
            JsonLogger.logError({
                    url: page.url(),
                    type: message.type().substring(0, 3).toUpperCase(),
                    error: messages.filter(Boolean),
                })
        });

        page.on('requestfailed', request => {
            const errorText = request.failure().errorText;
            if(/err_blocked_by_client/i.test(errorText)) {
                return;
            }
            JsonLogger.log({ url: request.url(), errorText, method: request.method()});
        });

        page.on("error", console.error);
        page.on("pageerror", console.error);

        page[Symbol.asyncDispose] = () => browser.close();
        
        return page as any;

    }

}