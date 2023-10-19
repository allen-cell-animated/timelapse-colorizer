from dataclasses import dataclass
from typing import List
from aicsimageio import AICSImage
import argparse
import logging
import numpy as np
import platform
import pandas as pd
import time

from nuc_morph_analysis.utilities.create_base_directories import create_base_directories
from nuc_morph_analysis.lib.preprocessing.load_data import (
    load_dataset,
    get_dataset_pixel_size,
)
from nuc_morph_analysis.lib.visualization.plotting_tools import (
    get_plot_labels_for_metric,
)
from data_writer_utils import (
    INITIAL_INDEX_COLUMN,
    ColorizerDatasetWriter,
    configureLogging,
    scale_image,
    remap_segmented_image,
)

# Example Commands:
# python timelapse-colorizer-data/generate_data.py --output_dir /allen/aics/animated-cell/Dan/fileserver/colorizer/data --dataset mama_bear --scale 0.25
# python timelapse-colorizer-data/generate_data.py --output_dir /allen/aics/animated-cell/Dan/fileserver/colorizer/data --dataset baby_bear --scale 0.25
# python timelapse-colorizer-data/generate_data.py --output_dir /allen/aics/animated-cell/Dan/fileserver/colorizer/data --dataset goldilocks --scale 0.25

# DATASET SPEC: See DATA_FORMAT.md for more details on the dataset format!
# You can find the most updated version on GitHub here:
# https://github.com/allen-cell-animated/nucmorph-colorizer/blob/main/documentation/DATA_FORMAT.md

# NUCMORPH DATA REFERENCE:
# dataset	string	In FMS manifest	Name of which dataset this row of data belongs to (baby_bear, goldilocks, or mama_bear)
# track_id	int	In FMS manifest	ID for a single nucleus in all frames for which it exists (single value per nucleus, consistent across multiple frames)
# CellID	hash	In FMS manifest	ID for a single instance/frame of a nucleus (every nucleus has a different value in every frame)
# index_sequence	int	In FMS manifest	frame number associated with the nucleus data in a given row, relative to the start of the movie
# colony_time	int	Needs calculated and added	Frame number staggered by a given amount per dataset, so that the frame numbers in all datasets are temporally algined relative to one another rather than all starting at 0
# raw_full_zstack_path	String	In FMS manifest	Path to zstack of raw image of entire colony in a single frame
# seg_full_zstack_path	String	In FMS manifest	Path to zstack of segmentation of entire colony in a single frame
# is_outlier	boolean	In FMS manifest	True if this nucleus in this frame is flagged as an outlier (a single nucleus may be an outlier in some frames but not others)
# edge_cell	boolean	In FMS manifest	True if this nucleus touches the edge of the FOV
# NUC_shape_volume_lcc	float	In FMS manifest	Volume of a single nucleus in pixels in a given frame
# NUC_position_depth	float	In FMS manifest	Height (in the z-direction) of the a single nucleus in pixels in a given frame
# NUC_PC1	float	Needs calculated and added	Value for shape mode 1 for a single nucleus in a given frame
# NUC_PC2	float	Needs calculated and added	Value for shape mode 2 for a single nucleus in a given frame
# NUC_PC3	float	Needs calculated and added	Value for shape mode 3 for a single nucleus in a given frame
# NUC_PC4	float	Needs calculated and added	Value for shape mode 4 for a single nucleus in a given frame
# NUC_PC5	float	Needs calculated and added	Value for shape mode 5 for a single nucleus in a given frame
# NUC_PC6	float	Needs calculated and added	Value for shape mode 6 for a single nucleus in a given frame
# NUC_PC7	float	Needs calculated and added	Value for shape mode 7 for a single nucleus in a given frame
# NUC_PC8	float	Needs calculated and added	Value for shape mode 8 for a single nucleus in a given frame

# OVERWRITE THESE!! These values should change based on your dataset. These are
# relabeled as constants here for clarity/intent of the column name.
OBJECT_ID_COLUMN = "label_img"
"""Column of object IDs (or unique row number)."""
TRACK_ID_COLUMN = "track_id"
"""Column of track ID for each object."""
TIMES_COLUMN = "index_sequence"
"""Column of frame number that the object ID appears in."""
SEGMENTED_IMAGE_COLUMN = "seg_full_zstack_path"
"""Column of path to the segmented image data or z stack for the frame."""
CENTROIDS_X_COLUMN = "centroid_x"
"""Column of X centroid coordinates, in pixels of original image data."""
CENTROIDS_Y_COLUMN = "centroid_y"
"""Column of Y centroid coordinates, in pixels of original image data."""
OUTLIERS_COLUMN = "is_outlier"
"""Column of outlier status for each object. (true/false)"""


def make_frames(grouped_frames, scale: float, writer: ColorizerDatasetWriter):
    """
    Generate the images and bounding boxes for each time step in the dataset.
    """
    nframes = len(grouped_frames)
    logging.info("Making {} frames...".format(nframes))

    for group_name, frame in grouped_frames:
        start_time = time.time()

        # Get the path to the segmented zstack image frame from the first row (should be the same for
        # all rows in this group, since they are all on the same frame).
        row = frame.iloc[0]
        frame_number = row[TIMES_COLUMN]
        # Flatten the z-stack to a 2D image.
        zstackpath = row[SEGMENTED_IMAGE_COLUMN]
        if platform.system() == "Windows":
            zstackpath = "/" + zstackpath
        zstack = AICSImage(zstackpath).get_image_data("ZYX", S=0, T=0, C=0)
        seg2d = zstack.max(axis=0)

        # Scale the image and format as integers.
        seg2d = scale_image(seg2d, scale)
        seg2d = seg2d.astype(np.uint32)

        # Remap the frame image so the IDs are unique across the whole dataset.
        seg_remapped, lut = remap_segmented_image(
            seg2d,
            frame,
            OBJECT_ID_COLUMN,
        )

        writer.update_and_write_bbox_data(grouped_frames, seg_remapped, lut)
        writer.write_image(seg_remapped, frame_number)

        time_elapsed = time.time() - start_time
        logging.info(
            "Frame {} finished in {:5.2f} seconds.".format(
                int(frame_number), time_elapsed
            )
        )


def make_features(
    dataset: pd.DataFrame, feature_names: List[str], writer: ColorizerDatasetWriter
):
    """
    Generate the outlier, track, time, centroid, and feature data files.
    """
    # Collect array data from the dataframe for writing.

    outliers = dataset[OUTLIERS_COLUMN].to_numpy()
    tracks = dataset[TRACK_ID_COLUMN].to_numpy()
    times = dataset[TIMES_COLUMN].to_numpy()
    centroids_x = dataset[CENTROIDS_X_COLUMN].to_numpy()
    centroids_y = dataset[CENTROIDS_Y_COLUMN].to_numpy()

    feature_data = []
    for i in range(len(feature_names)):
        # Scale feature to use actual units
        (scale_factor, label, unit) = get_plot_labels_for_metric(feature_names[i])
        f = dataset[feature_names[i]].to_numpy() * scale_factor
        feature_data.append(f)

    writer.write_feature_data(
        feature_data,
        tracks,
        times,
        centroids_x,
        centroids_y,
        outliers,
    )


def make_dataset(output_dir="./data/", dataset="baby_bear", do_frames=True, scale=1):
    """Make a new dataset from the given data, and write the complete dataset
    files to the given output directory.
    """
    writer = ColorizerDatasetWriter(output_dir, dataset, scale=scale)

    # use nucmorph to load data
    datadir, figdir = create_base_directories(dataset)
    pixsize = get_dataset_pixel_size(dataset)

    full_dataset = load_dataset(dataset, datadir=None)
    logging.info("Loaded dataset '" + str(dataset) + "'.")

    # Make a reduced dataframe grouped by time (frame number).
    columns = [TRACK_ID_COLUMN, TIMES_COLUMN, SEGMENTED_IMAGE_COLUMN, OBJECT_ID_COLUMN]
    reduced_dataset = full_dataset[columns]
    reduced_dataset = reduced_dataset.reset_index(drop=True)
    reduced_dataset[INITIAL_INDEX_COLUMN] = reduced_dataset.index.values
    grouped_frames = reduced_dataset.groupby(TIMES_COLUMN)

    # Get the units and human-readable label for each feature; we include this as
    # metadata inside the dataset manifest.
    features = ["NUC_shape_volume_lcc", "NUC_position_depth_lcc"]
    featureLabels = []
    featureMetadata = []
    formattedUnits = {
        "($\mu m$)": "μm",
        "($\mu m^3$)": "μm³",
        "($\mu m^3$/hr)": "μm³/hr",
        "(min)": "min",
        "($\mu m^{-1}$)": "μm⁻¹",
    }
    for i in range(len(features)):
        (scale_factor, label, unit) = get_plot_labels_for_metric(features[i])
        featureLabels.append(label.capitalize())
        featureMetadata.append({"units": formattedUnits[unit]})

    # Make the features, frame data, and manifest.
    nframes = len(grouped_frames)
    make_features(full_dataset, features, writer)
    if do_frames:
        make_frames(grouped_frames, scale, writer)
    writer.write_manifest(nframes, featureLabels, featureMetadata)


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
    default="baby_bear",
    help="Compatible named FMS dataset or FMS id to load. Will be loaded using `nuc_morph_analysis.preprocessing.load_data.load_dataset()`.",
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

    make_dataset(
        output_dir=args.output_dir,
        dataset=args.dataset,
        do_frames=not args.noframes,
        scale=args.scale,
    )
