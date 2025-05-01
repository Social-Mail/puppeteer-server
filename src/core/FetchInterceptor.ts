import { connect } from "net";
import { Page } from "puppeteer-core";
import { Agent, fetch } from "undici";

let dispatcher: Agent;

const createDispatcher = () => {

    const port = 443;
    const host = process.env.LOCALHOST || "0.0.0.0";

    return new Agent({
        connect: (options, callback) => {
            try {
                const s= connect({
                    port,
                    host
                }, () => callback(null, s));
                s.on("error", (e) => {
                    console.error(e);
                    callback(e, null);
                });
            } catch (error) {
                callback(error, null);
            }
        }
    });
};

export class FetchInterceptor {

    static async intercept(page: Page) {
        await page.setRequestInterception(true);
        await page.on("request", async (e) => {
             try {

                dispatcher ??= createDispatcher();

                const url = e.url();
                const r = await fetch(url, {
                    headers: e.headers(),
                    dispatcher,
                    body: e.hasPostData() ? e.postData() : void 0
                });
                const body = Buffer.from(await r.arrayBuffer());
                const headers = {};
                for (const [key, value] of r.headers.entries()) {
                    headers[key] = value;
                }
                await e.respond({
                    body,
                    contentType: r.headers.get("content-type"),
                    headers
                });
                
            } catch (error) {
                await e.respond({
                    body: error.cause?.stack ?? error.stack ?? error,
                    status: 500
                });
            }
        });
    }

}