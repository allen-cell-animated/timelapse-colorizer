import json
import logging
import os
import pathlib
from PIL import Image
from typing import List

import numpy as np
import pandas as pd
import skimage

INITIAL_INDEX = "initialIndex"


class NumpyValuesEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.float32):
            return float(obj)
        elif isinstance(obj, np.int64):
            return int(obj)
        return json.JSONEncoder.default(self, obj)


def save_lists(
    output_dir: str | pathlib.Path,
    dataset: str,
    outliers: np.array,
    tracks: np.array,
    centroids_x: np.array,
    centroids_y: np.array,
    times: np.array,
    scale: float,
    features: List[np.array],
):
    outpath = os.path.join(output_dir, dataset)
    os.makedirs(outpath, exist_ok=True)

    # TODO check outlier and replace values with NaN or something!
    logging.info("Writing outliers.json...")
    ojs = {"data": outliers.tolist(), "min": False, "max": True}
    with open(outpath + "/outliers.json", "w") as f:
        json.dump(ojs, f)

    # Note these must be in same order as features and same row order as the dataframe.
    logging.info("Writing track.json...")
    trjs = {"data": tracks.tolist()}
    with open(outpath + "/tracks.json", "w") as f:
        json.dump(trjs, f)

    logging.info("Writing times.json...")
    tijs = {"data": times.tolist()}
    with open(outpath + "/times.json", "w") as f:
        json.dump(tijs, f)

    logging.info("Writing centroids.json...")
    centroids_stacked = np.ravel(np.dstack([centroids_x, centroids_y]))
    centroids_stacked = centroids_stacked * scale
    centroids_stacked = centroids_stacked.astype(int)

    centroids_json = {"data": centroids_stacked.tolist()}
    with open(outpath + "/centroids.json", "w") as f:
        json.dump(centroids_json, f)

    logging.info("Writing feature json...")
    for i in range(len(features)):
        f = features[i]
        fmin = np.nanmin(f)
        fmax = np.nanmax(f)
        # TODO normalize output range excluding outliers?
        js = {"data": f.tolist(), "min": fmin, "max": fmax}
        with open(outpath + "/feature_" + str(i) + ".json", "w") as f:
            json.dump(js, f, cls=NumpyValuesEncoder)
    logging.info("Done writing features.")


def save_manifest(output_dir, dataset, num_frames: int, feature_names: List[str]):
    os.makedirs(os.path.join(output_dir, dataset), exist_ok=True)

    logging.info("Loaded dataset '" + str(dataset) + "'.")

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
    with open(os.path.join(output_dir, dataset) + "/manifest.json", "w") as f:
        json.dump(js, f)

    logging.info("Finished writing dataset.")


def remap_segmented_image(
    seg2d: np.ndarray,
    frame: pd.DataFrame,
    object_id_column: str,
    absolute_id_column: str = INITIAL_INDEX,
    lut_adjustment: int = 1,
) -> (np.ndarray, np.ndarray):
    # Map values in segmented image to new unique indices for whole dataset
    mx = np.nanmax(seg2d)
    lut = np.zeros((mx + 1), dtype=np.uint32)
    for row_index, row in frame.iterrows():
        # build our remapping LUT:
        label = int(row[object_id_column])
        # unique row ID for each object -> remap to unique index for whole dataset
        rowind = int(row[absolute_id_column])
        lut[label] = rowind + lut_adjustment

    # remap indices of this frame.
    seg_remapped = lut[seg2d]
    return (seg_remapped, lut)


def update_and_save_bbox_data(
    seg_remapped: np.ndarray,
    outpath: str | pathlib.Path,
    lut: np.ndarray,
    bbox_data: np.array,
):
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
            bbox_data[write_index : write_index + 2] = bbox_min
            bbox_data[write_index + 2 : write_index + 4] = bbox_max

    # Save bounding box to JSON
    bbox_json = {"data": np.ravel(bbox_data).tolist()}  # flatten to 2D
    with open(outpath + "/bounds.json", "w") as f:
        json.dump(bbox_json, f)


def scale_image(seg2d: np.ndarray, scale: float) -> np.ndarray:
    if scale != 1.0:
        seg2d = skimage.transform.rescale(seg2d, scale, anti_aliasing=False, order=0)
    return seg2d


def save_image(seg_remapped: np.ndarray, outpath: str | pathlib.Path, frame_num: int):
    seg_rgba = np.zeros(
        (seg_remapped.shape[0], seg_remapped.shape[1], 4), dtype=np.uint8
    )
    seg_rgba[:, :, 0] = (seg_remapped & 0x000000FF) >> 0
    seg_rgba[:, :, 1] = (seg_remapped & 0x0000FF00) >> 8
    seg_rgba[:, :, 2] = (seg_remapped & 0x00FF0000) >> 16
    seg_rgba[:, :, 3] = 255  # (seg2d & 0xFF000000) >> 24
    img = Image.fromarray(seg_rgba)  # new("RGBA", (xres, yres), seg2d)
    img.save(outpath + "/frame_" + str(frame_num) + ".png")
