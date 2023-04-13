import { DataTexture, IntType, RedIntegerFormat } from "three";
import { IFrameLoader } from "./ILoader";
import { loadImageElement } from "./util";

const DOWNSAMPLE_FACTOR = 4;

export default class ImageDataFrameLoader implements IFrameLoader {
  async load(url: string): Promise<DataTexture> {
    const image = await loadImageElement(url);
    const { width, height } = image;
    const scaledWidth = Math.floor(width / DOWNSAMPLE_FACTOR);
    const scaledHeight = Math.floor(height / DOWNSAMPLE_FACTOR);

    const canvas = document.createElement("canvas");
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(image, 0, 0, scaledWidth, scaledHeight);
    const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight).data;
    const dataArr = new Int32Array(imageData.buffer);
    const tex = new DataTexture(dataArr, scaledWidth, scaledHeight, RedIntegerFormat, IntType);
    tex.internalFormat = "R32I";
    tex.needsUpdate = true;
    return tex;
  }
}
