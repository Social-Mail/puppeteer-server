
import { resolve } from "dns/promises";
import { Agent } from "https";
import { connect, Socket } from "net";
import fetch from "node-fetch";


const createDispatcher = async (host: string) => {

    let port = Number(process.env.HTTPS_PORT || 443);

    host = process.env.LOCALHOST || "0.0.0.0";
    
    const socket = await new Promise<Socket>((resolve, reject) => {
        const s = connect({
            port,
            host,
        }, () => resolve(s));

        s.on("error", (e) => {
            console.error(e);
            reject(e);
        });
    });


    return new Agent({
        socket,
    });
};


export default class Http2Client {

    static async fetchLocal(url: string, { headers, body, method }) {

        const u = new URL(url);
        const host = u.hostname;

        const agent = await createDispatcher(host);

        return fetch(url, {
            agent,
            headers,
            body,
            method
        })

    }

}