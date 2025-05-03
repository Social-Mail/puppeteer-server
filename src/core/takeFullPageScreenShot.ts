import { Page } from "puppeteer-core";
import sharp from "sharp";

// Max texture size of the software GL backand of chronium. (16384px or 4096px)
// https://issues.chromium.org/issues/41347676
export const MAX_SIZE_PX = 16384;

const takeFullPageScreenshot = async (page: Page, type: "webp" | "png") => {
  const pageHeight = await getPageHeight(page);
  const deviceScaleFactor = page.viewport()?.deviceScaleFactor ?? 1;

  const scaledHeight = pageHeight * deviceScaleFactor;

  let screenshot: Uint8Array;
  if (scaledHeight > MAX_SIZE_PX) {
    screenshot = await captureLargeScreenshot(page, type); // here!
  } else {
    screenshot = await page.screenshot({
      fullPage: true,
      type,
    });
  }
  return screenshot;
};

export default takeFullPageScreenshot;

const captureLargeScreenshot = async (page: Page, type: "webp" | "png") => {
  const viewport = page.viewport()!;
  const deviceScaleFactor = viewport.deviceScaleFactor ?? 1;
  const width = viewport.width;

  const pageHeight = await getPageHeight(page);
  const screenshots: Uint8Array[] = [];

  const screenshotPromises = [];
  let currentYPosition = 0;

  const scaledPageHeight = pageHeight * deviceScaleFactor;

  while (currentYPosition < scaledPageHeight) {
    const clipHeight = Math.min(
      Math.floor(MAX_SIZE_PX / deviceScaleFactor),
      scaledPageHeight - currentYPosition
    );

    const screenshotPromise = page.screenshot({
      clip: {
        x: 0,
        y: currentYPosition,
        width: width,
        height: clipHeight,
      },
      omitBackground: true,
      type,
    });
    screenshotPromises.push(screenshotPromise);
    currentYPosition += clipHeight;
  }
  const values = await Promise.all(screenshotPromises);
  screenshots.push(...values);

  try {
    const screenshotBuffer = await stitchImages(
      width * deviceScaleFactor,
      scaledPageHeight,
      screenshots,
      type
    );

    const uint8Array = new Uint8Array(screenshotBuffer);

    return uint8Array as Uint8Array;
    // return screenshotBuffer.buffer;
  } catch (err) {
    console.error("Error stitching screenshots:", err);
    throw err; // Propagate the error
  }
};

const stitchImages = async (
  w: number,
  h: number,
  screenshots: Uint8Array[],
  type: "webp" | "png"
): Promise<Buffer> => {
  let currentHeight = 0;
  const compositeOperations = [];

  for (let i = 0; i < screenshots.length; i++) {
    const screenshot = screenshots[i];

    try {
      const img = sharp(screenshot);
      const { height: imgHeight } = await img.metadata();

      // Convert Uint8Array to Buffer
      const bufferInput = Buffer.from(screenshot);

      // Collect composite operations
      compositeOperations.push({
        input: bufferInput,
        top: currentHeight,
        left: 0,
      });

      currentHeight += imgHeight ?? 0;
    } catch (err) {
      console.error(`Error processing screenshot ${i}:`, err);
      throw err;
    }
  }

  const img = sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
    limitInputPixels: h * w,
  });

  const result = img.composite(compositeOperations);

  if (type === "png") {
    return await result.png().toBuffer();
  }
  return await result.webp().toBuffer();
};

declare var document;

const getPageHeight = async (page: Page): Promise<number> => {
  return await page.evaluate(() => document.documentElement.scrollHeight);
};
