import { Texture } from "three";

type CacheEntry = {
  frame: Texture;
  index: number;
  prev: number | null;
  next: number | null;
};

export default class FrameCache {
  private data: (CacheEntry | null)[];
  private first: number | null;
  private last: number | null;
  private numItems: number;
  private maxSize: number;

  constructor(length: number, maxSize: number = 15) {
    this.data = new Array(length).fill(null);
    this.first = null;
    this.last = null;
    this.numItems = 0;
    this.maxSize = maxSize;
  }

  /** Evict the last-used entry from the cache */
  private evictLast(): void {
    if (this.last === null) {
      console.error("Frame Cache: Attempt to evict last frame from cache when no last frame has been set");
      return;
    }

    const last = this.data[this.last];
    if (last === null) {
      console.error("Frame Cache: No frame to evict in last cache position");
      return;
    }

    if (last.next) {
      this.data[last.next]!.prev = null;
    }

    last.frame.dispose();
    this.data[last.index] = null;
    this.last = last.next;
  }

  /** Move a current entry in the cache to first position */
  private moveToFirst(entry: CacheEntry): void {
    const { prev, next, index } = entry;

    // This entry is already first
    if (this.first === index) {
      return;
    }

    this.data[next!]!.prev = prev;

    if (prev === null) {
      // this entry is last
      this.last = next;
    } else {
      this.data[prev]!.next = next;
    }

    if (this.first) {
      this.data[this.first]!.next = index;
    }

    entry.prev = this.first;
    entry.next = null;
    this.first = index;
  }

  /** Add a new entry to the cache in first position */
  private addAsFirst(entry: CacheEntry): void {
    if (this.first !== null) {
      this.data[this.first]!.next = entry.index;
      entry.prev = this.first;
    }
    this.first = entry.index;
  }

  public get length(): number {
    return this.data.length;
  }

  /** Add a frame to the cache at the specified index */
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
      this.addAsFirst(newEntry);

      if (this.numItems >= this.maxSize) {
        this.evictLast();
      } else {
        if (this.last === null) {
          this.last = newEntry.index;
        }
        this.numItems++;
      }
    }
  }

  public get(index: number): Texture | undefined {
    const entry = this.data[index];
    if (entry !== null) {
      this.moveToFirst(entry);
    }
    return entry?.frame;
  }

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
