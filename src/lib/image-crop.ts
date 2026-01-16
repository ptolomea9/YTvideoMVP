/**
 * Canvas-based image cropping utility.
 * Takes a source image and crop area, returns a cropped Blob.
 */

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Creates a cropped image from the source using canvas.
 *
 * @param imageSrc - Source image URL or data URL
 * @param pixelCrop - Crop area in pixels
 * @param outputSize - Optional fixed output size (defaults to crop size)
 * @returns Promise<Blob> - Cropped image as JPEG blob
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputSize?: { width: number; height: number }
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Set canvas size to output size or crop size
  const finalWidth = outputSize?.width ?? pixelCrop.width;
  const finalHeight = outputSize?.height ?? pixelCrop.height;
  canvas.width = finalWidth;
  canvas.height = finalHeight;

  // Draw the cropped portion of the image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    finalWidth,
    finalHeight
  );

  // Apply circular mask for headshot - areas outside the circle become transparent
  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  ctx.arc(
    finalWidth / 2, // center x
    finalHeight / 2, // center y
    Math.min(finalWidth, finalHeight) / 2, // radius
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Convert to PNG blob to preserve transparency
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      },
      "image/png"
    );
  });
}

/**
 * Loads an image from a URL or data URL.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = src;
  });
}

/**
 * Reads a File as a data URL.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
