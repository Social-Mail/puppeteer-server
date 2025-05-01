import { Page } from "puppeteer-core";
import Http2Client from "./Http2Client.js";
import { resolve } from "dns/promises";

export class FetchInterceptor {

    static async isLocalHost(host: string) {
        const hosts = await resolve(host);
        if (hosts[0] === "127.0.0.1") {
            return true;
        }
        return false;
    }

    static async intercept(page: Page) {
        await page.setRequestInterception(true);
        await page.on("request", async (e) => {
             try {

                let postBody = void 0;

                const url = e.url();

                const u = new URL(url);

                if (!/https?/i.test(u.protocol)) {
                    await e.continue();
                    return;
                }


                if (!await this.isLocalHost(u.hostname)) {
                    await e.continue();
                    return;
                }

                if (e.hasPostData()) {
                    postBody = e.postData();
                } else {
                    console.log(`Fetching ${url}`);
                }

                const r = await Http2Client.fetch(url, {
                    method: e.method(),
                    headers: e.headers(),
                    body: postBody
                });
                const headers = {};
                let contentType;
                const status = r.status;
                for (const [key, value] of r.headers.entries()) {
                    if (key.startsWith(":")) {
                        continue;
                    }
                    switch(key) {
                        case "keep-alive":
                        case "connection":
                        case "upgrade":
                        case "transfer-encoding":
                        case "alt-svc":
                        case "content-encoding":
                            continue;
                        case "content-type":
                            contentType = value;
                            break;
                    }
                    headers[key] = value;
                }
                const body = Buffer.from(await r.arrayBuffer());
                await e.respond({
                    status,
                    body,
                    contentType,
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