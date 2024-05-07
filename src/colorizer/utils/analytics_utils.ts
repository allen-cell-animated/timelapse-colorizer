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
  [AnalyticsEvent.COLLECTION_LOAD]: { collection_writer_version: string };
  // Include number of elements in the dataset? Number of features?
  [AnalyticsEvent.DATASET_LOAD]: { dataset_writer_version: string; dataset_total_objects: number };
  [AnalyticsEvent.EXPORT_COMPLETE]: { export_format: "mp4" | "png" };
  [AnalyticsEvent.FEATURE_SELECTED]: { feature_type: FeatureType; feature_range: number };
  [AnalyticsEvent.ROUTE_ERROR]: { error_message?: string; error_status?: number };
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
