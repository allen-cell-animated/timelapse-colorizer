// gaslight typescript
declare global {
  interface Window {
    dataLayer: Record<string, any>[];
  }
}

export const enum AnalyticsEvent {
  COLLECTION_LOAD = "collection_load",
  DATASET_LOAD = "dataset_load",
}

export type AnalyticsEventPayload<T extends AnalyticsEvent> = {
  [AnalyticsEvent.COLLECTION_LOAD]: { collection_writer_version: string };
  [AnalyticsEvent.DATASET_LOAD]: { dataset_writer_version: string };
}[T];

/**
 * Fires a custom event to Google Tag Manager. Should include the event name and any additional required data.
 */
export function triggerCustomEvent<T extends AnalyticsEvent>(eventName: T, data: AnalyticsEventPayload<T>): void {
  window.dataLayer.push({
    event: eventName,
    ...data,
  });
}
