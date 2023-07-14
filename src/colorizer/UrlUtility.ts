const URL_PARAM_TRACK = "track";
const URL_PARAM_DATASET = "dataset";
const URL_PARAM_FEATURE = "feature";
const URL_PARAM_TIME = "t";

export default class UrlUtility {
  /**
   * Updates the current URL path of the webpage. If any parameter value is falsy (null), it will not be
   * included.
   * @param dataset
   * @param feature
   * @param track
   * @param time
   */
  public static updateURL(
    dataset: string | null,
    feature: string | null,
    track: number | null,
    time: number | null
  ): void {
    const params: string[] = [];
    // Get parameters, ignoring null/empty values
    if (dataset) {
      params.push(`${URL_PARAM_DATASET}=${dataset}`);
    }
    if (feature) {
      params.push(`${URL_PARAM_FEATURE}=${feature}`);
    }
    if (track || track === 0) {
      params.push(`${URL_PARAM_TRACK}=${track}`);
    }
    if (time) {
      // time = 0 is ignored because it's the default frame.
      params.push(`${URL_PARAM_TIME}=${time}`);
    }

    // If parameters present, join with URL syntax and push into the URL
    const paramString = params.length > 0 ? "?" + params.join("&") : "";
    // Use replaceState rather than pushState, because otherwise every frame will be a unique
    // URL in the browser history
    window.history.replaceState(null, document.title, paramString);
  }

  /**
   * Loads parameters from the current window URL.
   * @returns An object with a dataset, feature, track, and time parameters.
   * The dataset and feature parameters are null if no parameter was found in the URL, and the
   * track and time will have negative values (-1) if no parameter (or an invalid parameter) was found.
   */
  public static loadParamsFromUrl(): { dataset: string | null; feature: string | null; track: number; time: number } {
    // Get params from URL and load, with default fallbacks.
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    const base10Radix = 10; // required for parseInt
    const datasetParam = urlParams.get(URL_PARAM_DATASET);
    const featureParam = urlParams.get(URL_PARAM_FEATURE);
    const trackParam = parseInt(urlParams.get(URL_PARAM_TRACK) || "-1", base10Radix);
    // This assumes there are no negative timestamps in the dataset
    const timeParam = parseInt(urlParams.get(URL_PARAM_TIME) || "-1", base10Radix);

    return {
      dataset: datasetParam,
      feature: featureParam,
      track: trackParam,
      time: timeParam,
    };
  }
}
