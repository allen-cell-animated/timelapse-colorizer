import {
  NearestFilter,
  PixelFormat,
  PixelFormatGPU,
  RGBAFormat,
  RGBAIntegerFormat,
  Texture,
  TextureEncoding,
} from "three";
import { IFrameLoader } from "./ILoader";

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
  private pixelFormat: PixelFormat;

  constructor(pixelFormat: PixelFormat = RGBAIntegerFormat) {
    this.pixelFormat = pixelFormat;
  }

  private textureEncodingToInternalFormat(encoding: PixelFormat): PixelFormatGPU {
    switch (encoding) {
      case RGBAIntegerFormat:
        return "RGBA8UI";
      case RGBAFormat:
        return "RGBA8I";
      default:
        throw new Error("Unsupported texture encoding");
    }
  }

  async load(url: string): Promise<Texture> {
    const img = await loadImageElement(url);
    let tex: Texture;
    tex = new Texture(img, undefined, undefined, undefined, NearestFilter, NearestFilter, this.pixelFormat);
    tex.generateMipmaps = false;
    tex.unpackAlignment = 1;
    if (this.pixelFormat === RGBAIntegerFormat) {
      tex.internalFormat = this.textureEncodingToInternalFormat(this.pixelFormat);
    }
    tex.needsUpdate = true;
    return tex;
  }
}
