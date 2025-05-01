import { connect } from "net";
import { Page } from "puppeteer-core";
import { Agent, fetch } from "undici";

let dispatcher: Agent;

const createDispatcher = () => {

    let port = Number(process.env.HTTPS_PORT || 443);
    const host = process.env.LOCALHOST || "0.0.0.0";

    return new Agent({
        connect: (options, callback) => {
            try {

                if (options.port) {
                    port = options.port as any;
                }

                const s = connect({
                    port,
                    host,
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

                let postBody = void 0;

                const url = e.url();

                if (e.hasPostData()) {
                    postBody = e.postData();
                } else {
                    console.log(`Fetching ${url}`);
                }

                const r = await fetch(url, {
                    method: e.method(),
                    headers: e.headers(),
                    dispatcher,
                    body: postBody
                });
                const body = Buffer.from(await r.arrayBuffer());
                const headers = {};
                let contentType;
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
                await e.respond({
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