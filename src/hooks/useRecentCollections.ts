import { useLocalStorage } from "usehooks-ts";

/** Key for local storage to read/write recently opened collections */
const RECENT_COLLECTIONS_STORAGE_KEY = "recentDatasets";
const MAX_RECENT_COLLECTIONS = 10;

export type RecentCollection = {
  /** The absolute URL path of the collection resource. */
  url: string;
  /**
   * The user input for the collection resource. If `undefined`, uses the
   * existing label (if already in recent datasets) or reuses the URL (if new).
   */
  label?: string;
};

/**
 * Stores and retrieves recent collections from local storage.
 * @returns an array containing the list of recent collections and a function to
 * add a new collection to the list.
 */
export const useRecentCollections = (): [RecentCollection[], (collection: RecentCollection) => void] => {
  const [recentCollections, setRecentCollections] = useLocalStorage<RecentCollection[]>(
    RECENT_COLLECTIONS_STORAGE_KEY,
    []
  );

  const addRecentCollection = (collection: RecentCollection): void => {
    const index = recentCollections.findIndex(({ url }) => url === collection.url);
    if (index === -1) {
      // New collection, add to front while maintaining max length
      if (collection.label === undefined) {
        collection.label = collection.url;
      }
      setRecentCollections([collection as RecentCollection, ...recentCollections.slice(0, MAX_RECENT_COLLECTIONS - 1)]);
    } else {
      // Move existing collection to front and update the label.
      const newCollectionEntry: RecentCollection = {
        url: collection.url,
        label: collection.label ?? recentCollections[index].label,
      };
      setRecentCollections([
        newCollectionEntry,
        ...recentCollections.slice(0, index),
        ...recentCollections.slice(index + 1),
      ]);
    }
  };
  return [recentCollections, addRecentCollection];
};
