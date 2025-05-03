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
        pageHeight
    }): Promise<Page & AsyncDisposable> {
        
        const browser = await puppeteer.launch({
            executablePath,
            acceptInsecureCerts: true,
            args: [... defaultArgs],
        });

        const page = await browser.newPage();
        
        const width = Number(pageWidth || 1024);
        const height = Number(pageHeight || 1024);
        await page.setViewport({ width, height });

        await FetchInterceptor.intercept(page);

        page.on("console", (msg) => console.log(... msg.args()));

        page[Symbol.asyncDispose] = () => browser.close();
        
        return page as any;

    }

}