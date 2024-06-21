export type DisposableValue = {
  dispose?: () => void;
};

type CacheEntry<E extends DisposableValue> = {
  key: string;
  value: E;
  size: number;
  prev: CacheEntry<E> | null;
  next: CacheEntry<E> | null;
};

/**
 * Generic LRU cache for data, intended for Texture or other GPU resources.
 * Calls `dispose` on eviction to keep GPU memory under control.
 *
 * Keys can be "reserved" which protects them from eviction and disposal.
 *
 * @template E The type of the data to be stored in the cache.
 * @param maxSize The maximum size of the cache. This can either be the number of entries
 * or the total size of the entries (e.g. bytes)
 *
 */
export default class DataCache<E extends DisposableValue> {
  private data: Map<string, CacheEntry<E>>;
  // Next points towards front of the list (most recently used), prev points towards back
  private first: CacheEntry<E> | null;
  private last: CacheEntry<E> | null;
  private currentSize: number;
  private maxSize: number;

  private reservedKeys: Set<string>;

  constructor(maxSize: number = 30) {
    this.data = new Map();
    this.first = null;
    this.last = null;
    this.currentSize = 0;
    this.maxSize = maxSize;

    this.reservedKeys = new Set();
  }

  /** Evicts the least recently used entry from the cache */
  private evictLast(): void {
    if (!this.last) {
      return;
    }

    if (this.last.next) {
      this.last.next.prev = null;
    }

    this.last.value.dispose && this.last.value.dispose();
    this.data.delete(this.last.key);
    this.currentSize -= this.last.size;
    this.last = this.last.next;
  }

  /** Places a new entry in the front of the list */
  private setNewEntryAsFirst(entry: CacheEntry<E>): void {
    if (this.first) {
      this.first.next = entry;
    }
    entry.prev = this.first;
    entry.next = null;
    this.first = entry;
  }

  /** Moves an entry currently in the list to the front */
  private moveToFirst(entry: CacheEntry<E>): void {
    if (entry === this.first) return;
    const { prev, next } = entry;

    if (prev) {
      prev.next = next;
    } else {
      this.last = next;
    }

    if (next) {
      next.prev = prev;
    }

    entry.next = null;
    this.setNewEntryAsFirst(entry);
  }

  /** Removes an entry from the linked list without disposing of it. */
  private removeFromList(entry: CacheEntry<E>): void {
    if (entry === this.first) {
      this.first = entry.prev;
    }
    if (entry === this.last) {
      this.last = entry.next;
    }
    if (entry.prev) {
      entry.prev.next = entry.next;
    }
    if (entry.next) {
      entry.next.prev = entry.prev;
    }
  }

  /**
   * Sets the currently reserved set of keys, preventing them from being evicted from the cache
   * and dispose of.
   * @param keys the set of keys that should be reserved.
   * If a key is already reserved but is not in this set, it will be unreserved.
   * Reserved keys will still count towards the total size limit.
   */
  public setReservedKeys(keys: Set<string>): void {
    // Check for newly added keys; remove from cache list so they cannot be
    // disposed of.
    keys.forEach((key) => {
      if (!this.reservedKeys.has(key)) {
        const entry = this.data.get(key);
        entry && this.removeFromList(entry);
      }
    });
    // Check for newly unreserved keys; add back to cache list as they are now eligible
    // for disposal.
    this.reservedKeys.forEach((key) => {
      if (!keys.has(key)) {
        const entry = this.data.get(key);
        entry && this.setNewEntryAsFirst(entry);
      }
    });

    this.reservedKeys = new Set(keys);
  }

  public get size(): number {
    return this.currentSize;
  }

  /** Inserts a frame into the cache at `index` */
  public insert(key: string | number, value: E, size: number = 1): void {
    key = key.toString();
    const currentEntry = this.data.get(key);

    if (size > this.maxSize) {
      console.error(`Attempted to insert a value of size ${size} into a cache with maxSize ${this.maxSize}`);
      return;
    }

    if (currentEntry !== null && currentEntry !== undefined) {
      // NOTE: This assumes that the value HAS NOT CHANGED. If it has,
      // the size of the cache will be incorrect and the old value will not be disposed of.
      currentEntry.value = value;
      if (!this.reservedKeys.has(key)) {
        this.moveToFirst(currentEntry);
      }
    } else {
      const newEntry = { value, key, prev: null, next: null, size: size };
      this.data.set(key, newEntry);

      this.currentSize += size;
      while (this.currentSize > this.maxSize && this.last) {
        this.evictLast();
      }
      if (!this.reservedKeys.has(key)) {
        this.setNewEntryAsFirst(newEntry);

        if (!this.last) {
          this.last = newEntry;
        }
      }
    }
  }

  /** Gets a frame from the cache. Returns `undefined` if no frame is present at `index`. */
  public get(key: string | number): E | undefined {
    key = key.toString();
    const entry = this.data.get(key);
    if (entry) {
      this.moveToFirst(entry);
    }
    return entry?.value;
  }

  /** Clears the cache and calls `dispose` on all cached values (including reserved keys) */
  public dispose(): void {
    this.first = null;
    this.last = null;
    this.currentSize = 0;
    this.data.forEach((cacheEntry) => {
      cacheEntry.value.dispose && cacheEntry.value.dispose();
    });
    this.data.clear();
  }
}

// TODO make this into a proper test
// function testFrameCache(): void {
//   const cache = new FrameCache(5, 3);

//   cache.insert(0, new DataTexture());
//   cache.insert(2, new DataTexture(new Uint8Array([8])));
//   console.log("Expect only 0 and 2 are not null");
//   console.log(cache.get(2));
//   console.log(cache.get(1));

//   cache.insert(2, new DataTexture(new Uint8Array([55])));
//   console.log("Expect 2 has been replaced");
//   console.log(cache.get(2));

//   cache.insert(1, new DataTexture());
//   cache.insert(3, new DataTexture());
//   console.log("Expect 0 is evicted");
//   console.log(cache.get(0));

//   cache.insert(1, new DataTexture());
//   console.log("Expect 2 is not evicted");
//   console.log(cache.get(2));
// }
