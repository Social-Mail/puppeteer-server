import DateTime from "@entity-access/entity-access/dist/types/DateTime.js";
import { Query } from "@entity-access/server-pages/dist/core/Query.js";
import puppeteer from 'puppeteer-core'
import { Agent, fetch } from "undici";
import { connect } from "net";
import { PuppeteerPath } from "./PuppeteerPath.js";
import { defaultArgs } from "./defaultArgs.js";
import { FetchInterceptor } from "./FetchInterceptor.js";
import { Page } from "puppeteer-core";

const { executablePath } = PuppeteerPath;


export default class BrowserPage {

    static async create({
        pageWidth,
        pageHeight,
        dumpio = false,
        deviceScaleFactor = 1
    }): Promise<Page & AsyncDisposable> {
        
        const browser = await puppeteer.launch({
            executablePath,
            acceptInsecureCerts: true,
            args: [... defaultArgs],
            dumpio
        });

        const page = await browser.newPage();
        
        const width = Number(pageWidth || 1024);
        const height = Number(pageHeight || 1024);
        deviceScaleFactor = Number(deviceScaleFactor);
        await page.setViewport({ width, height, deviceScaleFactor });

        await FetchInterceptor.intercept(page);

        page.on('console', async (message) => {
            if (message.text() != "JSHandle@error") {
                console.log(`${message.type().substring(0, 3).toUpperCase()} ${message.text()}`);
                return;
            }
            const messages = await Promise.all(message.args().map((arg) => {
                return arg.getProperty("message");
            }));
            
            console.log(`${message.type().substring(0, 3).toUpperCase()} ${messages.filter(Boolean)}`);
        });

        page.on('requestfailed', request => {
            console.log(`url: ${request.url()}, errText: ${request.failure().errorText}, method: ${request.method()}`)
        });

        page.on("error", console.error);
        page.on("pageerror", console.error);

        page[Symbol.asyncDispose] = () => browser.close();
        
        return page as any;

    }

}