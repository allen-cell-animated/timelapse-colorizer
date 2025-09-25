import { StateCreator } from "zustand";

import { SubscribableStore } from "../types";
import {
  addBackdropDerivedStateSubscribers,
  BackdropSliceActions,
  BackdropSliceSerializableState,
  BackdropSliceState,
  createBackdropSlice,
} from "./backdrop_slice";
import {
  addChannelDerivedStateSubscribers,
  ChannelSliceActions,
  ChannelSliceSerializableState,
  ChannelSliceState,
  createChannelSlice,
} from "./channel_slice";
import {
  CollectionSliceActions,
  CollectionSliceSerializableState,
  CollectionSliceState,
  createCollectionSlice,
} from "./collection_slice";
import {
  addColorRampDerivedStateSubscribers,
  ColorRampSliceActions,
  ColorRampSliceSerializableState,
  ColorRampSliceState,
  createColorRampSlice,
} from "./color_ramp_slice";
import { ConfigSliceActions, ConfigSliceSerializableState, ConfigSliceState, createConfigSlice } from "./config_slice";
import {
  createDatasetSlice,
  DatasetSliceActions,
  DatasetSliceSerializableState,
  DatasetSliceState,
} from "./dataset_slice";
import {
  addScatterPlotSliceDerivedStateSubscribers,
  createScatterPlotSlice,
  ScatterPlotSliceActions,
  ScatterPlotSliceSerializableState,
  ScatterPlotSliceState,
} from "./scatterplot_slice";
import {
  addThresholdDerivedStateSubscribers,
  createThresholdSlice,
  ThresholdSliceActions,
  ThresholdSliceSerializableState,
  ThresholdSliceState,
} from "./threshold_slice";
import {
  addTimeDerivedStateSubscribers,
  createTimeSlice,
  TimeSliceActions,
  TimeSliceSerializableState,
  TimeSliceState,
} from "./time_slice";
import {
  addVectorDerivedStateSubscribers,
  createVectorSlice,
  VectorSliceActions,
  VectorSliceSerializableState,
  VectorSliceState,
} from "./vector_slice";

export * from "./backdrop_slice";
export * from "./channel_slice";
export * from "./collection_slice";
export * from "./color_ramp_slice";
export * from "./config_slice";
export * from "./dataset_slice";
export * from "./scatterplot_slice";
export * from "./threshold_slice";
export * from "./time_slice";
export * from "./vector_slice";

export type ViewerStoreState = BackdropSliceState &
  ChannelSliceState &
  CollectionSliceState &
  ColorRampSliceState &
  ConfigSliceState &
  DatasetSliceState &
  ScatterPlotSliceState &
  ThresholdSliceState &
  TimeSliceState &
  VectorSliceState;

export type ViewerStoreActions = BackdropSliceActions &
  ChannelSliceActions &
  CollectionSliceActions &
  ColorRampSliceActions &
  ConfigSliceActions &
  DatasetSliceActions &
  ScatterPlotSliceActions &
  ThresholdSliceActions &
  TimeSliceActions &
  VectorSliceActions;

/**
 * State values in ViewerStore that can be serialized. Subset of
 * ViewerStoreState.
 */
export type ViewerStoreSerializableState = BackdropSliceSerializableState &
  ChannelSliceSerializableState &
  CollectionSliceSerializableState &
  ColorRampSliceSerializableState &
  ConfigSliceSerializableState &
  DatasetSliceSerializableState &
  ScatterPlotSliceSerializableState &
  ThresholdSliceSerializableState &
  TimeSliceSerializableState &
  VectorSliceSerializableState;

/**
 * Combined state for the React app. The ViewerState is composed of many smaller
 * **slices**, modules of related state, actions, and selectors. See
 * https://github.com/pmndrs/zustand/blob/main/docs/guides/typescript.md#slices-pattern
 * for more details on the pattern.
 */
export type ViewerStore = ViewerStoreState & ViewerStoreActions;

export const viewerStateStoreCreator: StateCreator<ViewerStore> = (...a) => ({
  ...createBackdropSlice(...a),
  ...createChannelSlice(...a),
  ...createCollectionSlice(...a),
  ...createColorRampSlice(...a),
  ...createConfigSlice(...a),
  ...createDatasetSlice(...a),
  ...createScatterPlotSlice(...a),
  ...createThresholdSlice(...a),
  ...createTimeSlice(...a),
  ...createVectorSlice(...a),
});

/**
 * Adds subscribers to the store that update derived state values when their
 * dependencies change. MUST be called after creating any store with the
 * `viewerStateStoreCreator`.
 */
export const addStoreStateSubscribers = (store: SubscribableStore<ViewerStore>): void => {
  addBackdropDerivedStateSubscribers(store);
  addChannelDerivedStateSubscribers(store);
  addColorRampDerivedStateSubscribers(store);
  addScatterPlotSliceDerivedStateSubscribers(store);
  addThresholdDerivedStateSubscribers(store);
  addTimeDerivedStateSubscribers(store);
  addVectorDerivedStateSubscribers(store);
};
