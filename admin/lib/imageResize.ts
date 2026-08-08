/** Downscales/crops an image file to a square JPEG data URL suitable for
 * storing directly on the employee document (no object storage configured
 * in this app) - a raw phone-camera photo would be several MB; this keeps
 * it in the tens-of-KB range so it's safe to persist inline in MongoDB. */
export function resizeImageToDataUrl(file: File, maxDimension = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read the selected file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file doesn't look like a valid image"));
      img.onload = () => {
        const size = Math.min(maxDimension, Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Image processing isn't supported in this browser"));
          return;
        }

        // Cover-crop to a centered square so the avatar isn't stretched.
        const sourceSize = Math.min(img.width, img.height);
        const sx = (img.width - sourceSize) / 2;
        const sy = (img.height - sourceSize) / 2;
        ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, size, size);

        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
