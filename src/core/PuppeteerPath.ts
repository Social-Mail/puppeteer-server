import { readdirSync } from "fs";
import { join } from "path";

const findFirst = (folder) => {
    for(const child of readdirSync(folder, { withFileTypes: true})) {
        if (child.isDirectory()) {
            const found = findFirst(join(child.parentPath, child.name));
            if (found) {
                return found;
            }
            continue;
        }

        if (child.name === "chrome") {
            return join(child.parentPath, child.name);
        }
    }
}

export const PuppeteerPath = {
    executablePath: findFirst("/home/pptruser/.cache/puppeteer/chrome")
};

console.log(`Found path ${PuppeteerPath.executablePath}`);
