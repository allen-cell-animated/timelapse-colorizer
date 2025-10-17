import type { StateCreator } from "zustand";

import type { SubscribableStore } from "src/state/types";

import {
  addBackdropDerivedStateSubscribers,
  type BackdropSliceActions,
  type BackdropSliceSerializableState,
  type BackdropSliceState,
  createBackdropSlice,
} from "./backdrop_slice";
import {
  addChannelDerivedStateSubscribers,
  type ChannelSliceActions,
  type ChannelSliceSerializableState,
  type ChannelSliceState,
  createChannelSlice,
} from "./channel_slice";
import {
  type CollectionSliceActions,
  type CollectionSliceSerializableState,
  type CollectionSliceState,
  createCollectionSlice,
} from "./collection_slice";
import {
  addColorRampDerivedStateSubscribers,
  type ColorRampSliceActions,
  type ColorRampSliceSerializableState,
  type ColorRampSliceState,
  createColorRampSlice,
} from "./color_ramp_slice";
import { type ConfigSliceActions, type ConfigSliceSerializableState, type ConfigSliceState, createConfigSlice } from "./config_slice";
import {
  createDatasetSlice,
  type DatasetSliceActions,
  type DatasetSliceSerializableState,
  type DatasetSliceState,
} from "./dataset_slice";
import {
  addScatterPlotSliceDerivedStateSubscribers,
  createScatterPlotSlice,
  type ScatterPlotSliceActions,
  type ScatterPlotSliceSerializableState,
  type ScatterPlotSliceState,
} from "./scatterplot_slice";
import {
  addThresholdDerivedStateSubscribers,
  createThresholdSlice,
  type ThresholdSliceActions,
  type ThresholdSliceSerializableState,
  type ThresholdSliceState,
} from "./threshold_slice";
import {
  addTimeDerivedStateSubscribers,
  createTimeSlice,
  type TimeSliceActions,
  type TimeSliceSerializableState,
  type TimeSliceState,
} from "./time_slice";
import {
  addVectorDerivedStateSubscribers,
  createVectorSlice,
  type VectorSliceActions,
  type VectorSliceSerializableState,
  type VectorSliceState,
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
