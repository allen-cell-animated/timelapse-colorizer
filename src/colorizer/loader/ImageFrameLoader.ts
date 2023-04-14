import { NearestFilter, RGBAIntegerFormat, Texture } from "three";
import { IFrameLoader } from "./ILoader";
import { loadImageElement } from "./util";

/** Does not currently work */
export default class ImageFrameLoader implements IFrameLoader {
  async load(url: string): Promise<Texture> {
    const img = await loadImageElement(url);
    const tex = new Texture(img, undefined, undefined, undefined, NearestFilter, NearestFilter, RGBAIntegerFormat);
    tex.unpackAlignment = 1;
    tex.internalFormat = "RGBA8UI";
    tex.needsUpdate = true;
    return tex;
  }
}
