from aicsimageio import AICSImage
from PIL import Image
import argparse
import json
import logging
import numpy as np
import os
import pandas as pd
import platform
import skimage
import time

from data_writer_utils import save_lists, save_manifest

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


def make_frames(grouped_frames, output_dir, dataset, scale: float):
    outpath = os.path.join(output_dir, dataset)

    # rows of spreadsheet (referring to unique cells) are zero based
    # however, we need to reserve 0 in our output image files for "no cell here"
    # so bump each row index by 1 (lut_adjustment) for output image files
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
        # sanity check - expect to have only one unique zstack per frame
        # print("Number of cells at timepoint: " + str(len(frame)))
        # n = len(pd.unique(frame['OutputMask (CAAX)']))
        # print(pd.unique(frame['OutputMask (CAAX)']))
        # print("Number of unique zstacks: " + str(n))

        # take first row to get zstack path
        row = frame.iloc[0]
        frame_number = row["Image_Metadata_Timepoint"]

        start_time = time.time()

        zstackpath = row["OutputMask (CAAX)"]
        zstackpath = zstackpath.strip('"')
        # zstackpath = zstackpath.replace(".tiff","",1)
        # if platform.system() == "Windows":
        #     zstackpath = "/" + zstackpath
        zstack = AICSImage(zstackpath).get_image_data("YX", S=0, T=0, C=0)
        seg2d = zstack  # .max(axis=0)
        mx = np.nanmax(seg2d)
        mn = np.nanmin(seg2d[np.nonzero(seg2d)])
        # float comparison with 1 here is okay because this is not a calculated value
        if scale != 1.0:
            seg2d = skimage.transform.rescale(
                seg2d, scale, anti_aliasing=False, order=0
            )
        seg2d = seg2d.astype(np.uint32)

        lut = np.zeros((mx + 1), dtype=np.uint32)
        for row_index, row in frame.iterrows():
            # build our remapping LUT:
            label = int(row["R0Nuclei_Number_Object_Number"])
            rowind = int(row["initialIndex"])
            lut[label] = rowind + lut_adjustment

        # remap indices of this frame.
        seg_remapped = lut[seg2d]

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

        # convert data to RGBA
        seg_rgba = np.zeros(
            (seg_remapped.shape[0], seg_remapped.shape[1], 4), dtype=np.uint8
        )
        seg_rgba[:, :, 0] = (seg_remapped & 0x000000FF) >> 0
        seg_rgba[:, :, 1] = (seg_remapped & 0x0000FF00) >> 8
        seg_rgba[:, :, 2] = (seg_remapped & 0x00FF0000) >> 16
        seg_rgba[:, :, 3] = 255  # (seg2d & 0xFF000000) >> 24
        img = Image.fromarray(seg_rgba)  # new("RGBA", (xres, yres), seg2d)
        img.save(outpath + "/frame_" + str(frame_number) + ".png")

        time_elapsed = time.time() - start_time
        logging.info(
            "Frame {} finished in {:5.2f} seconds.".format(
                int(frame_number), time_elapsed
            )
        )

        # Save bounding box to JSON
        bbox_json = {"data": np.ravel(bbox_data).tolist()}  # flatten to 2D
        with open(outpath + "/bounds.json", "w") as f:
            json.dump(bbox_json, f)


def make_features(a, features, output_dir, dataset, scale: float):
    # For now in this dataset there are no outliers. Just generate a list of falses.
    outliers = [False for i in range(len(a.index))]

    # Note these must be in same order as features and same row order as the dataframe.
    tracks = a["R0Nuclei_TrackObjects_Label_75"].to_numpy()

    times = a["Image_Metadata_Timepoint"].to_numpy()

    centroids_x = a["R0Nuclei_AreaShape_Center_X"].to_numpy()
    centroids_y = a["R0Nuclei_AreaShape_Center_Y"].to_numpy()

    feature_data = []
    for i in range(len(features)):
        f = a[features[i]].to_numpy()
        # TODO normalize output range excluding outliers?
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


def make_dataset(
    data, output_dir="./data/", dataset="3500005820_3", do_frames=True, scale=1
):
    a = data
    logging.info("Loaded dataset '" + str(dataset) + "'.")

    # track id = R0Nuclei_TrackObjects_Label_75
    # might have to generate the index_sequence column?
    # seg img = InputMask(CAAX) or OutputMask (CAAX)
    # index in seg img = R0Nuclei_Number_Object_Number
    columns = [
        "R0Nuclei_TrackObjects_Label_75",
        "Image_Metadata_Timepoint",
        "OutputMask (CAAX)",
        "R0Nuclei_Number_Object_Number",
    ]
    # b is the reduced dataset
    b = a[columns]
    b = b.reset_index(drop=True)
    b["initialIndex"] = b.index.values

    grouped_frames = b.groupby("Image_Metadata_Timepoint")
    # get a single path from each time in the set.
    # frames = grouped_frames.apply(lambda df: df.sample(1))

    features = [
        "mean migration speed per track (um/min)",
        "Integrated Distance (um)",
        "Displacement (um)",
        "Average colony overlap per track",
        "migration velocity (um/min)",
        "R0Cell_Neighbors_NumberOfNeighbors_Adjacent",
        "R0Cell_Neighbors_PercentTouching_Adjacent",
    ]
    make_features(a, features, output_dir, dataset, scale)

    if do_frames:
        make_frames(grouped_frames, output_dir, dataset, scale)

    nframes = len(grouped_frames)
    save_manifest(output_dir, dataset, nframes, features)


# TODO: Make top-level function
# This is stuff scientists are responsible for!!
def make_collection(output_dir="./data/", do_frames=True, scale=1, dataset=""):
    # example dataset name : 3500005820_3
    # use pandas to load data
    # a is the full collection!
    a = pd.read_csv(
        "//allen/aics/microscopy/EMTImmunostainingResults/EMTTimelapse_7-25-23/Output_CAAX/MigratoryTracksTable_AvgColonyOverlapLessThan0.9_AllPaths.csv"
    )

    if dataset != "":
        plate = dataset.split("_")[0]
        position = dataset.split("_")[1]
        c = a.loc[a["Image_Metadata_Plate"] == int(plate)]
        c = c.loc[c["Image_Metadata_Position"] == int(position)]
        make_dataset(c, output_dir, dataset, do_frames, scale)
    else:
        # for every combination of plate and position, make a dataset
        b = a.groupby(["Image_Metadata_Plate", "Image_Metadata_Position"])
        collection = []
        for name, group in b:
            dataset = str(name[0]) + "_" + str(name[1])
            print(dataset)
            collection.append({"name": dataset, "path": dataset})
            c = a.loc[a["Image_Metadata_Plate"] == name[0]]
            c = c.loc[c["Image_Metadata_Position"] == name[1]]
            make_dataset(c, output_dir, dataset, do_frames, scale)
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
    make_collection(
        output_dir=args.output_dir,
        dataset=args.dataset,
        do_frames=not args.noframes,
        scale=args.scale,
    )
