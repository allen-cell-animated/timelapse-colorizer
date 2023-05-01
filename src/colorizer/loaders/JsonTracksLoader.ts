import { TracksData, ITracksLoader } from "./ILoader";

type TracksDataJson = {
  trackIds: number[];
  trackTimes: number[];
};

const nanToNull = (json: string): string => json; //json.replace(/NaN/g, "null");

export default class JsonTracksLoader implements ITracksLoader {
  async load(url: string): Promise<TracksData> {
    const response = await fetch(url);
    const text = await response.text();
    const { trackIds, trackTimes }: TracksDataJson = JSON.parse(nanToNull(text));
    const trackIdsArr = new Uint32Array(trackIds);
    const timesArr = new Uint32Array(trackTimes);
    return { trackIds: trackIdsArr, times: timesArr };
  }
}
