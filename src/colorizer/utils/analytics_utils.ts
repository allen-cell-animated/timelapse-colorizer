import { FeatureType } from "../Dataset";

// Added by Google Tag Manager.
// Custom events are triggered by pushing to the `event` field.
// Additional data can also be pushed to include it as a parameter in the event.
// Note that data will persist in the dataLayer until the page is reloaded;
// this means that certain fields (like datasetWriterVersion) can be included in all subsequent
// events without needing to be re-pushed.
declare global {
  interface Window {
    // Optional because it is undefined in testing environments
    dataLayer?: Record<string, any>[];
  }
}

export const enum AnalyticsEvent {
  COLLECTION_LOAD = "collection_load",
  DATASET_LOAD = "dataset_load",
  EXPORT_COMPLETE = "export_complete",
  FEATURE_SELECTED = "feature_selected",
  ROUTE_ERROR = "route_error",
}

export type AnalyticsEventPayload<T extends AnalyticsEvent> = {
  [AnalyticsEvent.COLLECTION_LOAD]: { collectionWriterVersion: string };
  [AnalyticsEvent.DATASET_LOAD]: {
    datasetWriterVersion: string;
    datasetTotalObjects: number;
    datasetFeatureCount: number;
    datasetFrameCount: number;
  };
  [AnalyticsEvent.EXPORT_COMPLETE]: { exportFormat: "mp4" | "png" };
  [AnalyticsEvent.FEATURE_SELECTED]: { featureType: FeatureType; featureRange: number };
  [AnalyticsEvent.ROUTE_ERROR]: { errorMessage?: string; errorStatus?: number };
}[T];

/**
 * Fires a custom event to Google Tag Manager. Parameterized by event name and any additional required data.
 */
export function triggerAnalyticsEvent<T extends AnalyticsEvent>(event: T, data: AnalyticsEventPayload<T>): void {
  if (window.dataLayer) {
    window.dataLayer.push({
      event: event,
      ...data,
    });
  }
}
