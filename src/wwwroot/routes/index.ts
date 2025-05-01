import Content from "@entity-access/server-pages/dist/Content.js";
import Page from "@entity-access/server-pages/dist/Page.js";

export default class extends Page {

    run() {
        return this.notFound();
    }
}