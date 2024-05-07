import { FeatureType } from "../Dataset";

// Added by Google Tag Manager.
declare global {
  interface Window {
    dataLayer: Record<string, any>[];
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
  // Include number of elements in the dataset? Number of features?
  [AnalyticsEvent.DATASET_LOAD]: { datasetWriterVersion: string; datasetTotalObjects: number };
  [AnalyticsEvent.EXPORT_COMPLETE]: { exportFormat: "mp4" | "png" };
  [AnalyticsEvent.FEATURE_SELECTED]: { featureType: FeatureType; featureRange: number };
  [AnalyticsEvent.ROUTE_ERROR]: { errorMessage?: string; errorStatus?: number };
}[T];

/**
 * Fires a custom event to Google Tag Manager. Should include the event name and any additional required data.
 */
export function triggerAnalyticsEvent<T extends AnalyticsEvent>(eventName: T, data: AnalyticsEventPayload<T>): void {
  window.dataLayer.push({
    event: eventName,
    ...data,
  });
}
