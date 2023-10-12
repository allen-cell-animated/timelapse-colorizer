from dataclasses import dataclass
from aicsimageio import AICSImage
from PIL import Image
import argparse
import json
import logging
import numpy as np
import os
import platform
import skimage
import time

from data_writer_utils import (
    INITIAL_INDEX,
    remap_segmented_image,
    save_image,
    save_lists,
    save_manifest,
    scale_image,
    update_and_save_bbox_data,
)
from nuc_morph_analysis.utilities.create_base_directories import create_base_directories
from nuc_morph_analysis.preprocessing.load_data import (
    load_dataset,
    get_dataset_pixel_size,
)

# python timelapse-colorizer-data/generate_data.py --output_dir /allen/aics/animated-cell/Dan/fileserver/colorizer/data --dataset baby_bear
# python timelapse-colorizer-data/generate_data.py --output_dir /allen/aics/animated-cell/Dan/fileserver/colorizer/data --dataset mama_bear
# python timelapse-colorizer-data/generate_data.py --output_dir /allen/aics/animated-cell/Dan/fileserver/colorizer/data --dataset goldilocks

# DATASET SPEC:
# manifest.json:
#   frames: [frame_0.png, frame_1.png, ...]
#   features: { feature_0: feature_0.json, feature_1: feature_1.json, ... }
#   outliers: [ bool, bool, ... ] // per cell, same order as featureN.json files
#   tracks: "tracks.json" // per-cell track id, same format as featureN.json files
#   times: "times.json" // per-cell frame index, same format as featureN.json files
#   centroids: "centroids.json"  // per-cell centroid. For each index i, the
#       coordinates are (x: data[2i], y: data[2i + 1]).
#   bounds: "bounds.json"  // bounding boxes for each cell. For each index i, the
#       minimum bounding box coordinates (upper left corner) are given by
#       (x: data[4i], y: data[4i + 1]), and the maximum bounding box coordinates
#       (lower right corner) are given by (x: data[4i + 2], y: data[4i + 3]).
#
# frame0.png:  numbers stored in RGB. true scalar index is (R + G*256 + B*256*256)
#
# feature0.json: { data: [1.2, 3.4, 5.6, ...], min: 1.2, max: 5.6 }
#   there should be one value for every cell in the whole movie.
#   the min and max should be the global min and max across the whole movie
#   NaN (outlier) values are not yet supported

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


@dataclass
class config:
    object_id = "label_img"
    # The track associated with each ID.
    track_id = "track_id"
    # The frame number associated with the
    times = "index_sequence"
    segmented_image = "seg_full_zstack_path"
    centroid_x = "centroid_x"
    centroid_y = "centroid_y"
    # Add units here? Start thinking about including units in features?
    features = (["NUC_shape_volume_lcc", "NUC_position_depth"],)
    outliers = "is_outlier"


# Callbacks for calculating each of these? And then derive off of a base class?


def make_frames(grouped_frames, output_dir, dataset, scale: float):
    outpath = os.path.join(output_dir, dataset)

    lut_adjustment = 1
    nframes = len(grouped_frames)
    logging.info("Making {} frames...".format(nframes))
    # Get the highest index across all groups, and add +1 for zero-based indexing and the lut adjustment
    totalIndices = grouped_frames.initialIndex.max().max() + lut_adjustment + 1
    # Create an array, where for each segmentation index
    # we have 4 indices representing the bounds (2 sets of x,y coordinates).
    # ushort can represent up to 65_535. Images with a larger resolution than this will need to replace the datatype.
    bbox_data = np.zeros(shape=(totalIndices * 2 * 2), dtype=np.ushort)

    for group_name, frame in grouped_frames:
        # take first row to get zstack path
        row = frame.iloc[0]
        frame_number = row["index_sequence"]

        start_time = time.time()

        zstackpath = row["seg_full_zstack_path"]
        if platform.system() == "Windows":
            zstackpath = "/" + zstackpath
        zstack = AICSImage(zstackpath).get_image_data("ZYX", S=0, T=0, C=0)
        seg2d = zstack.max(axis=0)
        # float comparison with 1 here is okay because this is not a calculated value
        seg2d = scale_image(seg2d, scale)
        seg2d = seg2d.astype(np.uint32)

        seg_remapped, lut = remap_segmented_image(
            seg2d,
            frame,
            "label_img",
        )

        update_and_save_bbox_data(seg_remapped, outpath, lut, bbox_data)
        save_image(seg_remapped, outpath, frame_number)

        time_elapsed = time.time() - start_time
        logging.info(
            "Frame {} finished in {:5.2f} seconds.".format(
                int(frame_number), time_elapsed
            )
        )


def make_features(a, features, output_dir, dataset, scale: float):
    outliers = a["is_outlier"].to_numpy()

    tracks = a["track_id"].to_numpy()
    times = a["index_sequence"].to_numpy()

    centroids_x = a["centroid_x"].to_numpy()
    centroids_y = a["centroid_y"].to_numpy()

    feature_data = []
    for i in range(len(features)):
        # TODO normalize output range excluding outliers?
        f = a[features[i]].to_numpy()
        feature_data.append(f)

    save_lists(
        output_dir,
        dataset,
        outliers,
        tracks,
        centroids_x,
        centroids_y,
        times,
        scale,
        feature_data,
    )


def make_dataset(output_dir="./data/", dataset="baby_bear", do_frames=True, scale=1):
    os.makedirs(os.path.join(output_dir, dataset), exist_ok=True)

    # use nucmorph to load data
    datadir, figdir = create_base_directories(dataset)
    pixsize = get_dataset_pixel_size(dataset)

    # a is the full dataset!
    a = load_dataset(dataset, datadir=None)
    logging.info("Loaded dataset '" + str(dataset) + "'.")

    columns = ["track_id", "index_sequence", "seg_full_zstack_path", "label_img"]
    # b is the reduced dataset
    b = a[columns]
    b = b.reset_index(drop=True)
    b[INITIAL_INDEX] = b.index.values

    grouped_frames = b.groupby("index_sequence")
    # get a single path from each time in the set.
    # frames = grouped_frames.apply(lambda df: df.sample(1))

    nframes = len(grouped_frames)

    features = ["NUC_shape_volume_lcc", "NUC_position_depth"]
    make_features(a, features, output_dir, dataset, scale)

    if do_frames:
        make_frames(grouped_frames, output_dir, dataset, scale)

    save_manifest(output_dir, dataset, nframes, features)

    logging.info("Finished writing dataset.")


parser = argparse.ArgumentParser()
parser.add_argument(
    "--output_dir",
    type=str,
    default="./data/",
    help="Parent directory to output to. Data will be written to a subdirectory named after the dataset parameter.",
)
# TODO: Actually parameterize this? (does this need to be a CL arg?)
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
    # Set up logging
    debug_file = args.output_dir + "debug.log"
    open(debug_file, "w").close()  # clear debug file if it exists
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[  # output to both log file and stdout stream
            logging.FileHandler(debug_file),
            logging.StreamHandler(),
        ],
    )
    logging.info("Starting...")
    make_dataset(
        output_dir=args.output_dir,
        dataset=args.dataset,
        do_frames=not args.noframes,
        scale=args.scale,
    )
