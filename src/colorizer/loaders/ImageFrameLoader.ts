import { NearestFilter, RGBAIntegerFormat, Texture } from "three";
import { IFrameLoader } from "./ILoader";

/** Promise-ifies image loading */
export async function loadImageElement(url: string): Promise<HTMLImageElement> {
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
  async load(url: string): Promise<Texture> {
    const img = await loadImageElement(url);
    const tex = new Texture(img, undefined, undefined, undefined, NearestFilter, NearestFilter, RGBAIntegerFormat);
    tex.generateMipmaps = false;
    tex.unpackAlignment = 1;
    tex.internalFormat = "RGBA8UI";
    tex.needsUpdate = true;
    return tex;
  }
}
