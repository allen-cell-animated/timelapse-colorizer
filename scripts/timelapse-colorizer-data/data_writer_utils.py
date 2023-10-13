import json
import logging
import os
import pathlib
from PIL import Image
from typing import List, Union

import numpy as np
import pandas as pd
import skimage

INITIAL_INDEX_COLUMN = "initialIndex"
"""Column added to reduced datasets, holding the original indices of each row."""
RESERVED_INDICES = 1
"""Reserved indices that cannot be used for cell data. 
0 is reserved for the background."""


class NumpyValuesEncoder(json.JSONEncoder):
    """Handles float32 and int64 values."""

    def default(self, obj):
        if isinstance(obj, np.float32):
            return float(obj)
        elif isinstance(obj, np.int64):
            return int(obj)
        return json.JSONEncoder.default(self, obj)


def configureLogging(output_dir: Union[str, pathlib.Path], log_name="debug.log"):
    # Set up logging so logs are written to a file in the output directory
    os.makedirs(output_dir, exist_ok=True)
    debug_file = output_dir + log_name
    open(debug_file, "w").close()  # clear debug file if it exists
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[  # output to both log file and stdout stream
            logging.FileHandler(debug_file),
            logging.StreamHandler(),
        ],
    )


class ColorizerDatasetWriter:
    """
    Writes provided data as Colorizer-compatible dataset files to the configured output directory.

    The output directory will contain a `manifest.json` and additional dataset files,
    following the data schema described in the project documentation. (See
    [DATA_FORMAT.md](https://github.com/allen-cell-animated/nucmorph-colorizer/blob/main/documentation/DATA_FORMAT.md)
    for more details.)
    """

    outpath: Union[str, pathlib.Path]
    bbox_data: Union[np.array, None]
    scale: float

    def __init__(
        self, output_dir: Union[str, pathlib.Path], dataset: str, scale: float = 1
    ):
        self.outpath = os.path.join(output_dir, dataset)
        os.makedirs(self.outpath, exist_ok=True)
        self.scale = scale
        self.bbox_data = None

    def write_feature_data(
        self,
        features: List[np.array],
        tracks: np.array,
        times: np.array,
        centroids_x: np.array,
        centroids_y: np.array,
        outliers: np.array,
    ):
        """
        Writes feature, track, centroid, time, and outlier data to JSON files.
        Accepts numpy arrays for each file type and writes them to the configured
        output directory according to the data format.

        Features will be written to files in order of the `features` list,
        starting from 0 (e.g., `feature_0.json`, `feature_1.json`, ...)

        [documentation](https://github.com/allen-cell-animated/nucmorph-colorizer/blob/main/documentation/DATA_FORMAT.md#1-tracks)
        """
        # TODO check outlier and replace values with NaN or something!
        logging.info("Writing outliers.json...")
        ojs = {"data": outliers.tolist(), "min": False, "max": True}
        with open(self.outpath + "/outliers.json", "w") as f:
            json.dump(ojs, f)

        # Note these must be in same order as features and same row order as the dataframe.
        logging.info("Writing track.json...")
        trjs = {"data": tracks.tolist()}
        with open(self.outpath + "/tracks.json", "w") as f:
            json.dump(trjs, f)

        logging.info("Writing times.json...")
        tijs = {"data": times.tolist()}
        with open(self.outpath + "/times.json", "w") as f:
            json.dump(tijs, f)

        logging.info("Writing centroids.json...")
        centroids_stacked = np.ravel(np.dstack([centroids_x, centroids_y]))
        centroids_stacked = centroids_stacked * self.scale
        centroids_stacked = centroids_stacked.astype(int)

        centroids_json = {"data": centroids_stacked.tolist()}
        with open(self.outpath + "/centroids.json", "w") as f:
            json.dump(centroids_json, f)

        logging.info("Writing feature json...")
        for i in range(len(features)):
            f = features[i]
            fmin = np.nanmin(f)
            fmax = np.nanmax(f)
            # TODO normalize output range excluding outliers?
            js = {"data": f.tolist(), "min": fmin, "max": fmax}
            with open(self.outpath + "/feature_" + str(i) + ".json", "w") as f:
                json.dump(js, f, cls=NumpyValuesEncoder)
        logging.info("Done writing features.")

    def write_manifest(
        self,
        num_frames: int,
        feature_names: List[str],
    ):
        """
        Writes the final manifest file for the dataset in the configured output directory.

        [documentation](https://github.com/allen-cell-animated/nucmorph-colorizer/blob/main/documentation/DATA_FORMAT.md#Dataset)

        `manifest.json:`
        ```
          frames: [frame_0.png, frame_1.png, ...]

          # Names are given by `feature_names` parameter, in order.
          features: { "feature_0_name": "feature_0.json", "feature_1_name": "feature_1.json", ... }

          # per cell, same order as featureN.json files. true/false boolean values.
          outliers: "outliers.json"
          # per-cell track id, same format as featureN.json files
          tracks: "tracks.json"
          # per-cell frame index, same format as featureN.json files
          times: "times.json"
          # per-cell centroid. For each index i, the coordinates are (x: data[2i], y: data[2i + 1]).
          centroids: "centroids.json"
          # bounding boxes for each cell. For each index i, the minimum bounding box coordinates
          # (upper left corner) are given by (x: data[4i], y: data[4i + 1]),
          # and the maximum bounding box coordinates (lower right corner) are given by
          # (x: data[4i + 2], y: data[4i + 3]).
          bounds: "bounds.json"
        ```
        """
        # write manifest file
        featmap = {}
        for i in range(len(feature_names)):
            featmap[feature_names[i]] = "feature_" + str(i) + ".json"
        js = {
            "frames": ["frame_" + str(i) + ".png" for i in range(num_frames)],
            "features": featmap,
            "outliers": "outliers.json",
            "tracks": "tracks.json",
            "times": "times.json",
            "centroids": "centroids.json",
            "bounds": "bounds.json",
        }
        with open(self.outpath + "/manifest.json", "w") as f:
            json.dump(js, f)

        logging.info("Finished writing dataset.")

    def remap_segmented_image(
        self,
        seg2d: np.ndarray,
        frame: pd.DataFrame,
        object_id_column: str,
        absolute_id_column: str = INITIAL_INDEX_COLUMN,
    ) -> (np.ndarray, np.ndarray):
        """
        Remap the values in the segmented image 2d array so that each object has a
        unique ID across the whole dataset, accounting for reserved indices.

        Returns the remapped image and the lookup table (LUT) used to remap the IDs on
        this frame.
        """
        # Map values in segmented image to new unique indices for whole dataset
        max_object_id = int(np.nanmax(frame[object_id_column]))
        lut = np.zeros((max_object_id + 1), dtype=np.uint32)
        for row_index, row in frame.iterrows():
            # build our remapping LUT:
            object_id = int(row[object_id_column])
            # unique row ID for each object -> remap to unique index for whole dataset
            rowind = int(row[absolute_id_column])
            lut[object_id] = rowind + RESERVED_INDICES

        # remap indices of this frame.
        seg_remapped = lut[seg2d]
        return (seg_remapped, lut)

    def write_image(
        self,
        seg_remapped: np.ndarray,
        frame_num: int,
    ):
        """
        Writes the current segmented image to a PNG file in the output directory.
        The image will be saved as `frame_{frame_num}.png`.

        IDs for each pixel are stored in the RGBA channels of the image.

        [documentation](https://github.com/allen-cell-animated/nucmorph-colorizer/blob/main/documentation/DATA_FORMAT.md#3-frames)
        """
        seg_rgba = np.zeros(
            (seg_remapped.shape[0], seg_remapped.shape[1], 4), dtype=np.uint8
        )
        seg_rgba[:, :, 0] = (seg_remapped & 0x000000FF) >> 0
        seg_rgba[:, :, 1] = (seg_remapped & 0x0000FF00) >> 8
        seg_rgba[:, :, 2] = (seg_remapped & 0x00FF0000) >> 16
        seg_rgba[:, :, 3] = 255  # (seg2d & 0xFF000000) >> 24
        img = Image.fromarray(seg_rgba)  # new("RGBA", (xres, yres), seg2d)
        img.save(self.outpath + "/frame_" + str(frame_num) + ".png")

    def update_and_write_bbox_data(
        self,
        grouped_frames: pd.DataFrame,
        seg_remapped: np.ndarray,
        lut: np.ndarray,
    ):
        """
        Gets the bounding box data for all the indices in the current segmented image
        and progressively writes data to a JSON file in the output directory named `bounds.json`.

        [documentation](https://github.com/allen-cell-animated/nucmorph-colorizer/blob/main/documentation/DATA_FORMAT.md#6-bounds-optional)
        """
        # Create new bbox data array if needed
        if self.bbox_data is None:
            # .max() gives the highest object ID, but not the total number of indices
            # (we have to add 1.) 0 is a reserved index (no cells), so add 1.
            totalIndices = (
                grouped_frames[INITIAL_INDEX_COLUMN].max().max() + 1 + RESERVED_INDICES
            )
            # Create an array, where for each segmentation index
            # we have 4 indices representing the bounds (2 sets of x,y coordinates).
            # ushort can represent up to 65_535. Images with a larger resolution than this
            # will need to replace the datatype.
            self.bbox_data = np.zeros(shape=(totalIndices * 2 * 2), dtype=np.ushort)

        # Capture bounding boxes
        # Optimize by skipping i = 0, since it's used as a null value in every frame
        for i in range(1, lut.size):
            # Boolean array that represents all pixels segmented with this index
            cell = np.argwhere(seg_remapped == lut[i])

            if cell.size > 0:
                write_index = lut[i] * 4
                # Reverse min and max so it is written in x, y order
                bbox_min = cell.min(0).tolist()
                bbox_max = cell.max(0).tolist()
                bbox_min.reverse()
                bbox_max.reverse()
                self.bbox_data[write_index : write_index + 2] = bbox_min
                self.bbox_data[write_index + 2 : write_index + 4] = bbox_max

        # Save bounding box to JSON (write for each frame in case of crashing.)
        bbox_json = {"data": np.ravel(self.bbox_data).tolist()}  # flatten to 2D
        with open(self.outpath + "/bounds.json", "w") as f:
            json.dump(bbox_json, f)

    def scale_image(self, seg2d: np.ndarray) -> np.ndarray:
        """
        Scale an image by the writer's configured scale factor.
        """
        if self.scale != 1.0:
            seg2d = skimage.transform.rescale(
                seg2d, self.scale, anti_aliasing=False, order=0
            )
        return seg2d
