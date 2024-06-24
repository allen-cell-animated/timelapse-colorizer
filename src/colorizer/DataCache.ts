type DisposableValue = {
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
 */
export default class DataCache<E extends DisposableValue> {
  private data: Map<string, CacheEntry<E>>;
  private first: CacheEntry<E> | null;
  private last: CacheEntry<E> | null;
  private currentSize: number;
  private maxSize: number;

  constructor(maxSize: number = 30) {
    this.data = new Map();
    this.first = null;
    this.last = null;
    this.currentSize = 0;
    this.maxSize = maxSize;
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

  /** Places an entry in the front of the list */
  private setFirst(entry: CacheEntry<E>): void {
    if (this.first) {
      this.first.next = entry;
    }
    entry.prev = this.first;
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
    this.setFirst(entry);
  }

  public get size(): number {
    return this.currentSize;
  }

  /**
   * Inserts a value into the cache with the key. If the key already exists, the value is replaced.
   * If the cache is full, the least recently used entry is evicted and its `dispose()` function is
   * called if it exists.
   *
   * Throws an error if the size of the value is greater than the cache's maxSize.
   */
  public insert(key: string | number, value: E, size: number = 1): void {
    key = key.toString();
    const currentEntry = this.data.get(key);

    if (size > this.maxSize) {
      throw new Error(`Attempted to insert a value of size ${size} into a cache with maxSize ${this.maxSize}`);
    }

    if (currentEntry !== null && currentEntry !== undefined) {
      // NOTE: This assumes that the value's size HAS NOT CHANGED. If it has,
      // the size of the cache will be incorrect and the old value will not be disposed of.
      // TODO: Throw an error if the size is different?
      currentEntry.value = value;
      this.moveToFirst(currentEntry);
    } else {
      const newEntry = { value, key, prev: null, next: null, size: size };
      this.data.set(key, newEntry);

      this.currentSize += size;
      while (this.currentSize > this.maxSize && this.last) {
        this.evictLast();
      }

      this.setFirst(newEntry);
      if (!this.last) {
        this.last = newEntry;
      }
    }
  }

  /** Retrieves a value from the cache. Returns `undefined` if the `key` could not be found. */
  public get(key: string | number): E | undefined {
    key = key.toString();
    const entry = this.data.get(key);
    if (entry) {
      this.moveToFirst(entry);
    }
    return entry?.value;
  }

  /** Clears the cache and frees the GPU resources held by the textures in it */
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
