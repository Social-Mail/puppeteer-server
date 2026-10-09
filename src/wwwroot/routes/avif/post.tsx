import { Route } from "@entity-access/server-pages/dist/core/Route.js";
import { spawnSync } from "node:child_process";
import { spawnPromise } from "../../../core/spawnPromise.js";
import BaseConverterPage, { IConvertParams } from "../../../core/convert/BaseConvertPage.js";

export default class extends BaseConverterPage {

    async convert({
        input,
        output,
        args
    }: IConvertParams) {

         await spawnPromise("/ffmpeg/ffmpeg", [
            "-i",
            input.path,
            "-vf", "fps=25",
            "-c:v", "libsvtav1",
            "-crf", "12",
            "-an",
            "-loop", "0",
            ... args,
            "-y",
            output.path
        ]);

        return output;
    }

}