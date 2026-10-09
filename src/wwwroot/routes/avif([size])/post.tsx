import { Route } from "@entity-access/server-pages/dist/core/Route.js";
import { spawnSync } from "node:child_process";
import { spawnPromise } from "../../../core/spawnPromise.js";
import BaseConverterPage, { IConvertParams } from "../../../core/convert/BaseConvertPage.js";

export default class extends BaseConverterPage {

    @Route
    size: any;

    async convert({
        input,
        output,
        args
    }: IConvertParams) {

        const { size } = this;

        const ffprobe = spawnSync('/home/pptruser/ffmpeg/ffprobe', [
            '-v', 'error',
            '-show_entries', 'stream=index:stream_tags=handler_name',
            '-of', 'json',
            input.path
        ]);

        let streamIndex = '0:v:0'; // Safe default fallback

        if (ffprobe.status === 0) {
            try {
                const data = JSON.parse(ffprobe.stdout.toString());
                if (data.streams && data.streams.length > 0) {
                    // Look for the track labeled as the video track or animation track
                    // Usually, the thumbnail stream does not have a "Still Image" handler tag,
                    // or the animation track is the one at index 1 or 2.
                    // We dynamically locate the highest index video track or look for non-thumbnail streams.
                    const videoStreams = data.streams;
                    
                    if (videoStreams.length > 1) {
                        // If there are multiple streams, the animation track is structurally the last stream
                        streamIndex = `0:${videoStreams[videoStreams.length - 1].index}`;
                    } else {
                        // If there's only 1 stream, map the first available video track
                        streamIndex = '0:v:0';
                    }
                }
            } catch (e) {
            console.log('Failed to parse ffprobe JSON, using default stream fallback.');
            }
        }


        await spawnPromise("/home/pptruser/ffmpeg/ffmpeg", [
            "-i",
            input.path,
            '-map', streamIndex,
            "-vf", `scale='if(gt(ih,${size}),-2,iw)':'if(gt(ih,${size}),${size},ih)'`,
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