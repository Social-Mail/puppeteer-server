import { spawn } from 'child_process';
import { CDPSession, Page } from 'puppeteer-core';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface VideoRecorderOptions {
  page: Page;
  outputFile: string;
  fps?: number;
  scale?: number;
}

export class PuppeteerVideoRecorder {
  private page: Page;
  private outputFile: string;
  private scale: number;
  
  private client: CDPSession | null = null;
  private isRecording: boolean = false;

  // Track session assets
  private tmpDir: string = '';
  private concatScriptLines: string[] = [];
  private lastFrameFile: string | null = null;
  private lastFrameTimestamp: number | null = null;
  private videoDimensions: { width: number; height: number } = { width: 0, height: 0 };

  constructor(options: VideoRecorderOptions) {
    this.page = options.page;
    this.outputFile = options.outputFile;
    this.scale = options.scale ?? 1;
  }

  /**
   * Starts recording by saving raw frames asynchronously and capturing timestamps.
   */
  async start(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress.');
    }

    const viewport = this.page.viewport();
    if (!viewport) {
      throw new Error('Page viewport is not defined. Ensure page.setViewport() was called.');
    }

    // 1. Calculate and store video dimensions for the compilation step
    const width = Math.round(viewport.width * this.scale);
    const height = Math.round(viewport.height * this.scale);
    this.videoDimensions = {
      width: width % 2 === 0 ? width : width + 1,
      height: height % 2 === 0 ? height : height + 1
    };

    // 2. Initialize a clean state with async directory creation
    this.tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'puppeteer-frames-'));
    this.concatScriptLines = [];
    this.lastFrameFile = null;
    this.lastFrameTimestamp = null;
    this.isRecording = true;

    // 3. Connect to CDP Session
    this.client = await this.page.createCDPSession();
    
    this.client.on('Page.screencastFrame', async (event) => {
      if (!this.isRecording) {
        if (this.client) {
          await this.client.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
        }
        return;
      }

      const currentTimestamp = event.metadata.timestamp;
      const currentBuffer = Buffer.from(event.data, 'base64');
      
      // Save frame asset asynchronously using non-blocking I/O
      const currentFrameFile = path.join(this.tmpDir, `frame_${currentTimestamp}.jpg`);
      
      try {
        await fs.writeFile(currentFrameFile, currentBuffer);

        if (this.lastFrameTimestamp !== null && this.lastFrameFile !== null) {
          let duration = currentTimestamp - this.lastFrameTimestamp;
          if (duration <= 0) duration = 0.033; // 30fps fallback for microsecond variance

          // Buffer the text lines in memory
          this.concatScriptLines.push(`file '${this.lastFrameFile}'`);
          this.concatScriptLines.push(`duration ${duration.toFixed(6)}`);
        }

        this.lastFrameTimestamp = currentTimestamp;
        this.lastFrameFile = currentFrameFile;
      } catch (err) {
        console.error('Failed to write frame to disk asynchronously:', err);
      } finally {
        // Always acknowledge the frame so Chrome releases the next one immediately
        if (this.client) {
          await this.client.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
        }
      }
    });

    await this.client.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      everyNthFrame: 1
    });
  }

  /**
   * Stops recording, writes the playlist script, and compiles the video out-of-band.
   */
  async stop(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;

    // 1. Instantly detach from Chrome to stop incoming frame events
    if (this.client) {
      await this.client.send('Page.stopScreencast').catch(() => {});
      await this.client.detach().catch(() => {});
      this.client = null;
    }

    // 2. Append the trailing final frame to the text stack
    if (this.lastFrameFile) {
      this.concatScriptLines.push(`file '${this.lastFrameFile}'`);
      this.concatScriptLines.push(`duration 0.033`);
    }

    // If no frames were captured, clean up and exit early
    if (this.concatScriptLines.length === 0) {
      await fs.rm(this.tmpDir, { recursive: true, force: true }).catch(() => {});
      return;
    }

    // 3. Write out the compilation recipe file asynchronously
    const scriptPath = path.join(this.tmpDir, 'input.txt');
    await fs.writeFile(scriptPath, this.concatScriptLines.join('\n'));

    // 4. Run FFmpeg asynchronously now that your critical Puppeteer interactions are over
    return new Promise<void>((resolve, reject) => {
      const ffmpegProcess = spawn('ffmpeg', [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', scriptPath,                   
        '-vcodec', 'libvpx',
        '-crf', '30',
        '-b:v', '1M',
        '-vf', `scale=${this.videoDimensions.width}:${this.videoDimensions.height}`, 
        '-pix_fmt', 'yuv420p',
        this.outputFile
      ]);

      ffmpegProcess.on('error', async (err) => {
        await this.cleanupTempDir();
        reject(err);
      });

      ffmpegProcess.on('close', async (code) => {
        await this.cleanupTempDir();
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg processing failed with exit code ${code}`));
        }
      });
    });
  }

  /**
   * Asynchronously removes the temporary directory containing raw JPEGs and text manifests.
   */
  private async cleanupTempDir(): Promise<void> {
    try {
      await fs.rm(this.tmpDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Failed cleaning up recording frames:', err);
    }
  }
}
