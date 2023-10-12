import json
import logging
import os
import pathlib
from typing import List

import numpy as np


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
