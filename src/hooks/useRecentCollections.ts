import { useLocalStorage } from "usehooks-ts";

/** Key for local storage to read/write recently opened collections */
const RECENT_COLLECTIONS_STORAGE_KEY = "recentDatasets";
const MAX_RECENT_COLLECTIONS = 10;

export type RecentCollection = {
  /** The absolute URL path of the collection resource. */
  url: string;
  /**
   * The user input for the collection resource.
   * If `undefined`, uses the existing label (if already in recent datasets) or reuses the URL (if new).
   */
  label?: string;
};

/**
 * Wrapper around locally-stored recent collections.
 * @returns an array containing the list of recent collections and a function to add a new collection to the list.
 */
export const useRecentCollections = (): [RecentCollection[], (collection: RecentCollection) => void] => {
  const [recentCollections, setRecentCollections] = useLocalStorage<RecentCollection[]>(
    RECENT_COLLECTIONS_STORAGE_KEY,
    []
  );

  const addRecentCollection = (collection: RecentCollection): void => {
    const datasetIndex = recentCollections.findIndex(({ url }) => url === collection.url);
    if (datasetIndex === -1) {
      // New dataset, add to front while maintaining max length
      if (collection.label === undefined) {
        collection.label = collection.url;
      }
      setRecentCollections([collection as RecentCollection, ...recentCollections.slice(0, MAX_RECENT_COLLECTIONS - 1)]);
    } else {
      if (collection.label === undefined) {
        // Reuse existing label
        collection.label = recentCollections[datasetIndex].label;
      }
      // Move to front; this also updates the label if it changed.
      setRecentCollections([
        collection as RecentCollection,

        ...recentCollections.slice(0, datasetIndex),
        ...recentCollections.slice(datasetIndex + 1),
      ]);
    }
  };
  return [recentCollections, addRecentCollection];
};
