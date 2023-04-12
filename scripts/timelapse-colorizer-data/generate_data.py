from aicsimageio import AICSImage
from PIL import Image
import argparse
import json
import numpy as np
import os
import platform
import skimage

from nuc_morph_analysis.utilities.create_base_directories import create_base_directories
from nuc_morph_analysis.preprocessing.load_data import (
    load_dataset,
    get_dataset_pixel_size)

# python timelapse-colorizer-data/generate_data.py --output_dir /allen/aics/animated-cell/Dan/fileserver/colorizer/data --dataset baby_bear
# python timelapse-colorizer-data/generate_data.py --output_dir /allen/aics/animated-cell/Dan/fileserver/colorizer/data --dataset mama_bear
# python timelapse-colorizer-data/generate_data.py --output_dir /allen/aics/animated-cell/Dan/fileserver/colorizer/data --dataset goldilocks

# DATASET SPEC:
# manifest.json:
#   frames: [frame_0.png, frame_1.png, ...]
#   features: { feature_0: feature_0.json, feature_1: feature_1.json, ... }
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
			

def make_frames(frames, output_dir, dataset, nframes):
    downsample = 1

    for i in range(nframes):
        zstackpath = frames.iloc[i]["seg_full_zstack_path"]
        if platform.system() == "Windows":
            zstackpath = "/" + zstackpath
        zstack = AICSImage(zstackpath).get_image_data("ZYX", S=0, T=0, C=0)
        seg2d = zstack.max(axis=0)
        mx = np.nanmax(seg2d)
        mn = np.nanmin(seg2d[np.nonzero(seg2d)])

        # TODO test this
        if downsample != 1:
            seg2d = skimage.transform.rescale(seg2d, downsample, anti_aliasing=False, order=0)

        # convert data to RGBA
        seg_rgba = np.zeros((seg2d.shape[0], seg2d.shape[1], 4), dtype=np.uint8)
        seg_rgba[:, :, 0] = (seg2d & 0x000000FF) >> 0
        seg_rgba[:, :, 1] = (seg2d & 0x0000FF00) >> 8
        seg_rgba[:, :, 2] = (seg2d & 0x00FF0000) >> 16
        seg_rgba[:, :, 3] = 255  # (seg2d & 0xFF000000) >> 24
        img = Image.fromarray(seg_rgba)  # new("RGBA", (xres, yres), seg2d)
        img.save(output_dir + dataset + "/frame_" + str(i) + ".png")


def make_features(a, features, output_dir, dataset):
    nfeatures = len(features)

    outpath = os.path.join(output_dir, dataset)
    # TODO check outlier and replace values with NaN or something!
    outliers = a["is_outlier"].to_numpy()
    ojs = {"data": outliers.tolist(), "min": False, "max": True}
    with open(outpath + "/outliers.json", "w") as f:
        json.dump(ojs, f)

    for i in range(nfeatures):
        f = a[features[i]].to_numpy()
        fmin = np.nanmin(f)
        fmax = np.nanmax(f)
        # TODO normalize output range excluding outliers?
        js = {"data": f.tolist(), "min": fmin, "max": fmax}
        with open(outpath + "/feature_" + str(i) + ".json", "w") as f:
            json.dump(js, f)


def make_dataset(output_dir="./data/", dataset="baby_bear"):
    os.makedirs(os.path.join(output_dir, dataset), exist_ok=True)

    # use nucmorph to load data
    datadir, figdir = create_base_directories(dataset)
    pixsize = get_dataset_pixel_size(dataset)

    # a is the full dataset!
    a = load_dataset(dataset, datadir=None)

    columns = ["track_id", "index_sequence", "seg_full_zstack_path"] # , "CellID"]
    b = a[columns]

    # get a single path from each time in the set.
    frames = b.groupby('index_sequence').apply(lambda df: df.sample(1))

    nframes = len(frames)

    make_frames(frames, output_dir, dataset, nframes)

    features = ["NUC_shape_volume_lcc", "NUC_position_depth"]

    make_features(a, features, output_dir, dataset)

    # write some kind of manifest
    featmap = {}
    for i in range(len(features)):
        featmap["feature_" + str(i)] = "feature_" + str(i) + ".json"
    js = {
        "frames": ["frame_" + str(i) + ".png" for i in range(nframes)],
        "features": featmap,
    }
    with open(os.path.join(output_dir, dataset) + "/manifest.json", "w") as f:
        json.dump(js, f)


parser = argparse.ArgumentParser()
parser.add_argument("--output_dir", type=str, default="./data/")
parser.add_argument("--dataset", type=str, default="baby_bear")
args = parser.parse_args()
if __name__ == "__main__":
    make_dataset(output_dir=args.output_dir, dataset=args.dataset)
