import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { CDPSession, Page } from 'puppeteer-core';
import { Writable } from 'stream';

export interface VideoRecorderOptions {
  page: Page;
  outputFile: string;
  fps?: number;
  scale?: number;
}

export class PuppeteerVideoRecorder {
  private page: Page;
  private outputFile: string;
  private fps: number;
  private scale: number;
  
  private client: CDPSession | null = null;
  private ffmpegProcess: ChildProcessWithoutNullStreams | null = null;
  private ffmpegStdin: Writable | null = null;
  private isRecording: boolean = false;

  constructor(options: VideoRecorderOptions) {
    this.page = options.page;
    this.outputFile = options.outputFile;
    this.fps = options.fps ?? 30;
    this.scale = options.scale ?? 1;
  }

  /**
   * Starts recording the Puppeteer page.
   */
  async start(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress.');
    }

    // 1. Derive dimensions from the viewport
    const viewport = this.page.viewport();
    if (!viewport) {
      throw new Error('Page viewport is not defined. Ensure page.setViewport() was called.');
    }

    const width = Math.round(viewport.width * this.scale);
    const height = Math.round(viewport.height * this.scale);

    // Ensure dimensions are even numbers (required by many video codecs like VP8/VP9)
    const videoWidth = width % 2 === 0 ? width : width + 1;
    const videoHeight = height % 2 === 0 ? height : height + 1;

    // 2. Initialize FFmpeg process tailored for WebM (VP8) output
    this.ffmpegProcess = spawn('ffmpeg', [
      '-y',                       // Overwrite output file if it exists
      '-f', 'image2pipe',         // Input format is a pipe of images
      '-vcodec', 'mjpeg',         // Puppeteer outputs JPEG chunks by default
      '-r', `${this.fps}`,        // Framerate of the input
      '-i', '-',                  // Read input from stdin
      '-vcodec', 'libvpx',        // WebM standard video codec (VP8)
      '-crf', '30',               // Constant Rate Factor (lower means better quality, 4-63)
      '-b:v', '1M',               // Video bitrate
      '-vf', `scale=${videoWidth}:${videoHeight}`, // Explicit scaling step
      '-pix_fmt', 'yuv420p',      // Ensure compatibility with standard players
      this.outputFile
    ]);

    this.ffmpegStdin = this.ffmpegProcess.stdin;

    // Handle FFmpeg process errors/logging
    this.ffmpegProcess.stderr.on('data', (data) => {
      // Uncomment for debugging FFmpeg internal output:
      // console.log(`[FFmpeg Log]: ${data.toString()}`);
    });

    this.ffmpegProcess.on('error', (err) => {
      console.error('FFmpeg process error:', err);
    });

    this.isRecording = true;

    // 3. Connect to Chrome DevTools Protocol to capture the screencast
    this.client = await this.page.target().createCDPSession();
    
    // Listen for frame metadata chunks from Chrome
    this.client.on('Page.screencastFrame', async (event) => {
      if (!this.isRecording || !this.ffmpegStdin) {
        if (this.client) {
          await this.client.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
        }
        return;
      }

      // Convert the base64 chunk straight to binary buffer and pipe to FFmpeg
      const buffer = Buffer.from(event.data, 'base64');
      this.ffmpegStdin.write(buffer);

      // Acknowledge the frame so Chrome sends the next one
      await this.client.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
    });

    // Start casting frames
    await this.client.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      everyNthFrame: 1
    });
  }

  /**
   * Stops recording and clean up processes. Resolves when the file is safely saved.
   */
  async stop(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;

    // 1. Stop Chrome screencast and detach session
    if (this.client) {
      await this.client.send('Page.stopScreencast').catch(() => {});
      await this.client.detach().catch(() => {});
      this.client = null;
    }

    // 2. Safely close FFmpeg stream and wait for exit code
    return new Promise<void>((resolve) => {
      if (this.ffmpegStdin) {
        this.ffmpegStdin.end(); // Closing stdin signals FFmpeg to finish encoding
      }

      if (this.ffmpegProcess) {
        this.ffmpegProcess.on('close', () => {
          this.ffmpegProcess = null;
          this.ffmpegStdin = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
