import { DataTexture, RedFormat, FloatType } from "three";

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

/** Pack a 1d data array into the squarest 2d texture possible */
export function packFloatDataTexture(data: number[]): DataTexture {
  const width = Math.ceil(Math.sqrt(data.length));
  const height = Math.ceil(data.length / width);
  const length = width * height;

  while (data.length < length) {
    data.push(0);
  }

  const tex = new DataTexture(new Float32Array(data), width, height, RedFormat, FloatType);
  tex.internalFormat = "R32F";
  tex.needsUpdate = true;
  return tex;
}
