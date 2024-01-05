"""
A utility script for converting nuclear segmentation data from the EMT project. Original dataset
provided by Leigh Harris!

Note that this dataset does not have track IDs, so each unique object ID is treated as its own track.

To export the default datasets, you can run:
```
python timelapse-colorizer-data/convert_emt_nuclear_data.py --scale 1.0 --output_dir=/allen/aics/animated-cell/Dan/fileserver/colorizer/EMT_nuclear
```
"""

from typing import List
from aicsimageio import AICSImage
import argparse
import json
import logging
import numpy as np
import pandas as pd
from pandas.core.groupby.generic import DataFrameGroupBy
import time

from data_writer_utils import (
    INITIAL_INDEX_COLUMN,
    ColorizerDatasetWriter,
    FeatureMetadata,
    configureLogging,
    scale_image,
    remap_segmented_image,
    update_collection,
)

# DATASET SPEC: See DATA_FORMAT.md for more details on the dataset format!
# You can find the most updated version on GitHub here:
# https://github.com/allen-cell-animated/nucmorph-colorizer/blob/main/documentation/DATA_FORMAT.md

# OVERWRITE THESE!! These values should change based on your dataset. These are
# relabeled as constants here for clarity/intent of the column name.
OBJECT_ID_COLUMN = "Label"
"""Column of object IDs (or unique row number)."""
# Track ID column purposefully removed here, as it does not exist in this dataset.
TIMES_COLUMN = "Frame"
"""Column of frame number that the object ID appears in."""
SEGMENTED_IMAGE_COLUMN = "Filepath"
"""Column of path to the segmented image data or z stack for the frame."""
CENTROIDS_X_COLUMN = "x"
"""Column of X centroid coordinates, in pixels of original image data."""
CENTROIDS_Y_COLUMN = "y"
"""Column of Y centroid coordinates, in pixels of original image data."""
FEATURE_COLUMNS = [
    "Slice",
    "Area",
    "Orientation",
    "Aspect_Ratio",
    "Circularity",
    "Mean_Fluor",
]
"""Columns of feature data to include in the dataset. Each column will be its own feature file."""

FEATURE_COLUMNS_TO_UNITS = {
    "Mean_Fluor": "AU",  # arbitrary units
    "Area": "px²",
}
FEATURE_COLUMNS_TO_NAMES = {
    "Aspect_Ratio": "Aspect Ratio",
    "Mean_Fluor": "Mean Fluorescence",
}


def make_frames(
    grouped_frames: DataFrameGroupBy,
    scale: float,
    writer: ColorizerDatasetWriter,
):
    """
    Generate the images and bounding boxes for each time step in the dataset.
    """
    nframes = len(grouped_frames)
    logging.info("Making {} frames...".format(nframes))

    is_nonzero = lambda n: n != 0

    for group_name, frame in grouped_frames:
        start_time = time.time()

        # Get the path to the segmented zstack image frame from the first row (should be the same for
        # all rows in this group, since they are all on the same frame).
        row = frame.iloc[0]
        frame_number = row[TIMES_COLUMN]
        # Flatten the z-stack to a 2D image.
        zstackpath = row[SEGMENTED_IMAGE_COLUMN]
        zstackpath = zstackpath.strip('"')
        zstack = AICSImage(zstackpath).get_image_data("ZYX", S=0, T=0, C=0)
        # Do a min projection instead of a max projection to prioritize objects which have lower IDs (which for this dataset,
        # indicates lower z-indices). This is due to the nature of the data, where lower cell nuclei have greater confidence,
        # and should be visualized when overlapping instead of higher nuclei.
        # Do a min operation but ignore zero values. Without this, doing `min(0, id)` will always return 0 which results
        # in black images. We use `np.ma.masked_equal` to mask out 0 values and have them be ignored,
        # then replace masked values with 0 again (`filled(0)`) to get our final projected image.
        masked = np.ma.masked_equal(zstack, 0, copy=False)
        seg2d = masked.min(axis=0).filled(0)

        # Scale the image and format as integers.
        seg2d = scale_image(seg2d, scale)
        seg2d = seg2d.astype(np.uint32)

        # Remap the frame image so the IDs are unique across the whole dataset.
        seg_remapped, lut = remap_segmented_image(
            seg2d,
            frame,
            OBJECT_ID_COLUMN,
        )

        writer.write_image_and_bounds_data(
            seg_remapped, grouped_frames, frame_number, lut
        )

        time_elapsed = time.time() - start_time
        logging.info(
            "Frame {} finished in {:5.2f} seconds.".format(
                int(frame_number), time_elapsed
            )
        )


def make_features(
    dataset: pd.DataFrame,
    features: List[str],
    writer: ColorizerDatasetWriter,
):
    """
    Generate the outlier, track, time, centroid, and feature data files.
    """
    # Collect array data from the dataframe for writing.

    # For now in this dataset there are no outliers. Just generate a list of falses.
    outliers = np.array([False for i in range(len(dataset.index))])
    times = dataset[TIMES_COLUMN].to_numpy()
    centroids_x = dataset[CENTROIDS_X_COLUMN].to_numpy()
    centroids_y = dataset[CENTROIDS_Y_COLUMN].to_numpy()

    # This dataset does not have tracks, so we just generate a list of indices, one for each
    # object. This will be a very simple numpy table, where tracks[i] = i.
    shape = dataset.shape
    tracks = np.array([*range(shape[0])])

    feature_data = []
    for feature in features:
        f = dataset[feature].to_numpy()
        feature_data.append(f)

    writer.write_feature_data(
        feature_data,
        tracks,
        times,
        centroids_x,
        centroids_y,
        outliers,
    )


def make_dataset(
    data: pd.DataFrame,
    output_dir="./data/",
    dataset="3500005820_3",
    do_frames=True,
    scale=1,
):
    """Make a new dataset from the given data, and write the complete dataset
    files to the given output directory.
    """
    writer = ColorizerDatasetWriter(output_dir, dataset, scale=scale)
    full_dataset = data
    logging.info("Loaded dataset '" + str(dataset) + "'.")

    # Make a reduced dataframe grouped by time (frame number).
    columns = [
        TIMES_COLUMN,
        SEGMENTED_IMAGE_COLUMN,
        OBJECT_ID_COLUMN,
    ]
    reduced_dataset = full_dataset[columns]
    reduced_dataset = reduced_dataset.reset_index(drop=True)
    reduced_dataset[INITIAL_INDEX_COLUMN] = reduced_dataset.index.values
    grouped_frames = reduced_dataset.groupby(TIMES_COLUMN)

    # Get the units and human-readable label for each feature; we include this as
    # metadata inside the dataset manifest.
    feature_labels = []
    feature_metadata: List[FeatureMetadata] = []
    for feature in FEATURE_COLUMNS:
        label = FEATURE_COLUMNS_TO_NAMES.get(feature, feature)
        unit = FEATURE_COLUMNS_TO_UNITS.get(feature, None)
        feature_labels.append(label[0:1].upper() + label[1:])  # Capitalize first letter
        feature_metadata.append({"units": unit})

    # Make the features, frame data, and manifest.
    nframes = len(grouped_frames)
    make_features(full_dataset, FEATURE_COLUMNS, writer)
    if do_frames:
        make_frames(grouped_frames, scale, writer)
    writer.write_manifest(nframes, feature_labels, feature_metadata)


# This is stuff scientists are responsible for!!
def make_collection(output_dir="./data/", do_frames=True, scale=1, dataset=""):
    if dataset != "":
        # convert just the described dataset.
        readPath = f"/allen/aics/assay-dev/computational/data/EMT_deliverable_processing/LH_Analysis/Version2_ForPlotting/{dataset}.csv"
        data = pd.read_csv(readPath)
        logging.info("Making dataset '" + dataset + "'.")
        make_dataset(data, output_dir, dataset, do_frames, scale)

        # Update the collections file if it already exists
        collection_filepath = output_dir + "/collection.json"
        update_collection(collection_filepath, dataset, dataset)
    else:
        # For every condition, make a dataset.
        conditions = [
            "LOW_Matrigel_lumenoid",
            "High_Matrigel_lumenoid",
            "2D_Matrigel",
            "2D_PLF",
        ]
        collection = []

        for condition in conditions:
            # Read in each of the conditions as a dataset
            collection.append({"name": condition, "path": condition})
            readPath = f"/allen/aics/assay-dev/computational/data/EMT_deliverable_processing/LH_Analysis/Version2_ForPlotting/{condition}.csv"
            data = pd.read_csv(readPath)
            logging.info("Making dataset '" + condition + "'.")
            make_dataset(data, output_dir + "/" + condition, dataset, do_frames, scale)
        # write the collection.json file
        with open(output_dir + "/collection.json", "w") as f:
            json.dump(collection, f)


parser = argparse.ArgumentParser()
parser.add_argument(
    "--output_dir",
    type=str,
    default="./data/",
    help="Parent directory to output to. Data will be written to a subdirectory named after the dataset parameter.",
)
parser.add_argument(
    "--dataset",
    type=str,
    default="",
    help="Compatible named FMS dataset or FMS id to load. Will be loaded from hardcoded csv.",
)
parser.add_argument(
    "--noframes",
    action="store_true",
    help="If included, generates only the feature data, centroids, track data, and manifest, skipping the frame and bounding box generation.",
)
parser.add_argument(
    "--scale",
    type=float,
    default=1.0,
    help="Uniform scale factor that original image dimensions will be scaled by. 1 is original size, 0.5 is half-size in both X and Y.",
)

args = parser.parse_args()
if __name__ == "__main__":
    configureLogging(args.output_dir)
    logging.info("Starting...")

    make_collection(
        output_dir=args.output_dir,
        dataset=args.dataset,
        do_frames=not args.noframes,
        scale=args.scale,
    )
