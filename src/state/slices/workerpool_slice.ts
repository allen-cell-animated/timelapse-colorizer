import { StateCreator } from "zustand";

import SharedWorkerPool from "../../colorizer/workers/SharedWorkerPool";

export type WorkerPoolSlice = {
  workerPool: SharedWorkerPool;
};

export const createWorkerPoolSlice: StateCreator<WorkerPoolSlice, [], [], WorkerPoolSlice> = (_set, _get) => ({
  workerPool: new SharedWorkerPool(),
});
