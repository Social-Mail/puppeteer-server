import { availableParallelism } from 'os';
import ClusterInstance, { RecycledWorker } from "@entity-access/server-pages/dist/ClusterInstance.js";
import { sleep } from './core/sleep.js';

const numCPUs = process.env.SOCIAL_MAIL_CLUSTER_WORKERS
            ? Number(process.env.SOCIAL_MAIL_CLUSTER_WORKERS)
            : availableParallelism();

export default class WebCluster extends ClusterInstance<any> {

    public static start() {
        const c = new WebCluster();
        c.run(null);
    }

    protected async runPrimary(): Promise<void> {

        const workers = [] as RecycledWorker[];
        console.log(`Creating cluster ${numCPUs} workers`);
        for (let index = 0; index < numCPUs; index++) {
            workers.push(this.fork());
        }

        // sleep for 1 hours
        await sleep(1*60*60*1000);

        for (const worker of workers) {
            worker.destroy();
        }

        // force restart
        process.exit(0);
    }
    protected async runWorker(): Promise<void> {
        await import("./WebServer.js");
    }

}