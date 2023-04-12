import { FrameData, IFrameLoader } from "./ILoader";

/** Promise-ifies image loading */
async function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = document.createElement("img");
    image.crossOrigin = url;

    function onLoad(): void {
      removeEventListeners();
      resolve(image);
    }

    function onError(event: ErrorEvent): void {
      removeEventListeners();
      reject(event);
    }

    function removeEventListeners(): void {
      image.removeEventListener("load", onLoad);
      image.removeEventListener("error", onError);
    }

    image.addEventListener("load", onLoad);
    image.addEventListener("error", onError);
    image.src = url;
  });
}

export default class ImageFrameLoader implements IFrameLoader {
  async load(url: string): Promise<FrameData> {
    const image = await loadImageElement(url);
    const { width, height } = image;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height).data;
    const data = new Uint32Array(imageData.buffer);
    return { data, width, height };
  }
}
