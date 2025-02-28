import { DataTexture, RGBAFormat, Texture, UnsignedByteType } from "three";

import {
  ArraySource,
  Dataset,
  FeatureArrayType,
  FeatureDataType,
  featureTypeSpecs,
  IArrayLoader,
  ITextureImageLoader,
} from "../src/colorizer";
import { AnyManifestFile } from "../src/colorizer/utils/dataset_utils";
import { fetchWithTimeout } from "../src/colorizer/utils/url_utils";

export const ANY_ERROR = /[.]*/;
export const DEFAULT_DATASET_PATH = "https://some-path.json";

export async function sleep(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeoutMs));
}

export function makeMockFetchMethod(validUrl: string, bodyJson: any): typeof fetchWithTimeout {
  const response: Response = {
    headers: new Headers(),
    ok: true,
    redirected: false,
    status: 200,
    statusText: "OK",
    url: validUrl,
    type: "cors",
    body: bodyJson.toString(),
    clone: function (): Response {
      throw new Error("Function not implemented.");
    },
    bodyUsed: false,
    arrayBuffer: function (): Promise<ArrayBuffer> {
      throw new Error("Function not implemented.");
    },
    blob: function (): Promise<Blob> {
      throw new Error("Function not implemented.");
    },
    formData: function (): Promise<FormData> {
      throw new Error("Function not implemented.");
    },
    json: function (): Promise<any> {
      const dummyAsync = async (): Promise<any> => {
        return bodyJson;
      };
      return dummyAsync();
    },
    text: function (): Promise<string> {
      throw new Error("Function not implemented.");
    },
  };
  return (url: string, _timeoutMs?: number, _options?: Object) => {
    if (url === validUrl) {
      const resolve = async (): Promise<Response> => {
        return response;
      };
      return resolve();
    }

    return new Promise((_resolve, reject) => {
      reject("Failed to fetch due to incorrect url.");
    });
  };
}

export const makeMockAsyncLoader = <T>(url: string, manifestJson: T): ((url: string) => Promise<T>) => {
  return async (inputUrl: string): Promise<T> => {
    if (inputUrl !== url) {
      throw new Error(`Input url '${inputUrl}' does not match expected url '${url}'.`);
    }
    return Promise.resolve(manifestJson);
  };
};

export class MockFrameLoader implements ITextureImageLoader {
  width: number;
  height: number;

  constructor(width: number = 1, height: number = 1) {
    this.width = width;
    this.height = height;
  }

  load(_url: string): Promise<Texture> {
    return Promise.resolve(
      new DataTexture(
        new Uint8Array(this.width * this.height * 4),
        this.width,
        this.height,
        RGBAFormat,
        UnsignedByteType
      )
    );
  }
}

export class MockArraySource<T extends FeatureDataType> implements ArraySource<T> {
  private type: T;

  constructor(type: T) {
    this.type = type;
  }

  getBuffer<T extends FeatureDataType>(): FeatureArrayType[T] {
    return new featureTypeSpecs[this.type].ArrayConstructor([]) as unknown as FeatureArrayType[T];
  }
  getTexture(): Texture {
    return new Texture();
  }
  getMin(): number {
    return 0;
  }
  getMax(): number {
    return 1;
  }
}

export class MockArrayLoader implements IArrayLoader {
  dispose(): void {}

  load<T extends FeatureDataType>(_url: string, type: T): Promise<ArraySource<T>> {
    return Promise.resolve(new MockArraySource(type));
  }
}

export const makeMockDataset = async (manifest: AnyManifestFile): Promise<Dataset> => {
  const dataset = new Dataset(DEFAULT_DATASET_PATH, new MockFrameLoader(), new MockArrayLoader());
  const mockLoader = makeMockAsyncLoader(DEFAULT_DATASET_PATH, manifest);
  await dataset.open({ manifestLoader: mockLoader });
  return dataset;
};
