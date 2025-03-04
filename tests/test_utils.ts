import { fetchWithTimeout } from "../src/colorizer/utils/url_utils";

export const ANY_ERROR = /[.]*/;

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
    bytes: function (): Promise<Uint8Array> {
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
