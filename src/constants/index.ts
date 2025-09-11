import { DEFAULT_ANNOTATION_LABEL_COLORS } from "../colorizer/AnnotationData";

export const DEFAULT_PLAYBACK_FPS = 10;
export const MAX_FEATURE_CATEGORIES = 12;

export const INTERNAL_BUILD = import.meta.env.VITE_INTERNAL_BUILD === "true";
export const VERSION_NUMBER = import.meta.env.VITE_APP_VERSION;
export const BASE_URL = import.meta.env.BASE_URL;

export const BACKDROP_BRIGHTNESS_MIN = 0;
export const BACKDROP_BRIGHTNESS_MAX = 200;
export const BACKDROP_BRIGHTNESS_DEFAULT = 100;
export const BACKDROP_SATURATION_MIN = 0;
export const BACKDROP_SATURATION_MAX = 100;
export const BACKDROP_SATURATION_DEFAULT = 100;
export const BACKDROP_OBJECT_OPACITY_MIN = 0;
export const BACKDROP_OBJECT_OPACITY_MAX = 100;
export const BACKDROP_OBJECT_OPACITY_DEFAULT = 50;
export const COLOR_RAMP_RANGE_DEFAULT: [number, number] = [0, 0];

export const CANVAS_ASPECT_RATIO = 14.6 / 10;

export const DEFAULT_LABEL_COLOR_PRESETS = [
  {
    label: "Presets",
    colors: DEFAULT_ANNOTATION_LABEL_COLORS,
  },
];

export const TOOLTIP_TRIGGER: ("hover" | "focus")[] = ["hover", "focus"];

export * from "./url";
