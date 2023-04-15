import { Texture } from "three";

type CacheEntry = {
  frame: Texture;
  index: number;
  prev: CacheEntryNullable;
  next: CacheEntryNullable;
};

type CacheEntryNullable = CacheEntry | null;

/** LRU cache for textures. Calls `dispose` on eviction to keep GPU memory under control. */
export default class FrameCache {
  private data: CacheEntryNullable[];
  private first: CacheEntryNullable;
  private last: CacheEntryNullable;
  private numItems: number;
  private maxSize: number;

  constructor(length: number, maxSize: number = 30) {
    this.data = new Array(length).fill(null);
    this.first = null;
    this.last = null;
    this.numItems = 0;
    this.maxSize = maxSize;
  }

  /** Evicts the least recently used entry from the cache */
  private evictLast() {
    if (!this.last) {
      console.error("Attempt to evict last frame from cache when no last frame has been set");
      return;
    }

    if (this.last.next) {
      this.last.next.prev = null;
    }

    this.last.frame.dispose();
    this.data[this.last.index] = null;
    this.last = this.last.next;
  }

  /** Places an entry in the front of the list */
  private setFirst(entry: CacheEntry): void {
    if (this.first) {
      this.first.next = entry;
    }
    entry.prev = this.first;
    this.first = entry;
  }

  /** Moves an entry currently in the list to the front */
  private moveToFirst(entry: CacheEntry): void {
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

  public get length(): number {
    return this.data.length;
  }

  /** Inserts a frame into the cache at `index` */
  public insert(index: number, frame: Texture): void {
    if (index >= this.data.length) {
      return;
    }

    const currentEntry = this.data[index];
    if (currentEntry !== null) {
      currentEntry.frame = frame;
      this.moveToFirst(currentEntry);
    } else {
      const newEntry = { frame, index, prev: null, next: null };
      this.data[index] = newEntry;
      this.setFirst(newEntry);

      if (this.numItems >= this.maxSize) {
        this.evictLast();
      } else {
        if (!this.last) {
          this.last = newEntry;
        }
        this.numItems++;
      }
    }
  }

  /** Gets a frame from the cache. Returns `undefined` if no frame is present at `index`. */
  public get(index: number): Texture | undefined {
    const entry = this.data[index];
    if (entry) {
      this.moveToFirst(entry);
    }
    return entry?.frame;
  }

  /** Clears the cache and frees the GPU resources held by the textures in it */
  public dispose(): void {
    this.first = null;
    this.last = null;
    this.numItems = 0;
    // To be extra sure, iterate over array rather than stepping through list
    this.data = this.data.map((entry) => {
      entry?.frame.dispose();
      return null;
    });
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
