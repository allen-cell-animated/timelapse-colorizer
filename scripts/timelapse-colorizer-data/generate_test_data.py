from PIL import Image
import json
import numpy as np
import os

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


def make_dataset(output_dir="./data/", dataset="dataset1", nframes=5, nfeatures=2):
    out_path = output_dir + dataset
    os.makedirs(out_path, exist_ok=True)

    xres = 360
    yres = 240
    cells_per_frame = 4
    cell_size = xres // cells_per_frame
    cell_half_size = cell_size // 2

    bbox_data = np.zeros(shape=(cells_per_frame * nframes * 2 * 2), dtype=np.ushort)
    centroid_data = np.zeros(shape=(cells_per_frame * nframes * 2), dtype=np.ushort)
    track_data = np.zeros(shape=(cells_per_frame * nframes), dtype=np.ushort)
    times_data = np.zeros(shape=(cells_per_frame * nframes), dtype=np.ushort)
    outliers_data = np.zeros(shape=(cells_per_frame * nframes), dtype=np.ushort)

    for i in range(nframes):
        # Interpolation index
        t = (1.0 * i) / (nframes - 1)
        # make a fake segmentation
        seg2d = np.zeros((yres, xres), dtype=np.uint32)
        for track in range(cells_per_frame):
            id = track * nframes + i

            x_centroid = cell_half_size + track * cell_size
            # Move "cells" down vertically over the frames
            y_centroid = int(cell_half_size + t * (yres - cell_size))
            x_min = x_centroid - cell_half_size + 2
            y_min = y_centroid - cell_half_size + 2
            x_max = x_centroid + cell_half_size - 2
            y_max = y_centroid + cell_half_size - 2

            seg2d[y_min:y_max, x_min:x_max] = id + 1
            times_data[id] = i
            track_data[id] = track
            bbox_data[4 * id + 0] = x_min
            bbox_data[4 * id + 1] = y_min
            bbox_data[4 * id + 2] = x_max
            bbox_data[4 * id + 3] = y_max
            centroid_data[2 * id + 0] = x_centroid
            centroid_data[2 * id + 1] = y_centroid

        # convert data to RGBA
        seg_rgba = np.zeros((yres, xres, 4), dtype=np.uint8)
        seg_rgba[:, :, 0] = (seg2d & 0x000000FF) >> 0
        seg_rgba[:, :, 1] = (seg2d & 0x0000FF00) >> 8
        seg_rgba[:, :, 2] = (seg2d & 0x00FF0000) >> 16
        seg_rgba[:, :, 3] = 255  # (seg2d & 0xFF000000) >> 24
        img = Image.fromarray(seg_rgba)  # new("RGBA", (xres, yres), seg2d)
        img.save(out_path + "/frame_" + str(i) + ".png")

    totalcells = cells_per_frame * nframes

    bbox_json = {"data": bbox_data.tolist()}
    with open(out_path + "/bounds.json", "w") as f:
        json.dump(bbox_json, f)
    times_json = {"data": times_data.tolist()}
    with open(out_path + "/times.json", "w") as f:
        json.dump(times_json, f)
    track_json = {"data": track_data.tolist()}
    with open(out_path + "/tracks.json", "w") as f:
        json.dump(track_json, f)
    centroid_json = {"data": centroid_data.tolist()}
    with open(out_path + "/centroids.json", "w") as f:
        json.dump(centroid_json, f)
    # Convert to boolean
    outliers_json = {"data": np.array(outliers_data, dtype="bool").tolist()}
    with open(out_path + "/outliers.json", "w") as f:
        json.dump(outliers_json, f)

    for i in range(nfeatures):
        # create a fake feature in a random range:
        fmin = 0.0
        fmax = 10.0
        feature = (fmax - fmin) * np.random.random_sample((totalcells,)) + fmin
        true_fmin = np.min(feature)
        true_fmax = np.max(feature)
        js = {"data": feature.tolist(), "min": true_fmin, "max": true_fmax}
        with open(out_path + "/feature_" + str(i) + ".json", "w") as f:
            json.dump(js, f)

    # write some kind of manifest
    featmap = {}
    for i in range(nfeatures):
        featmap["feature_" + str(i)] = "feature_" + str(i) + ".json"
    js = {
        "frames": ["frame_" + str(i) + ".png" for i in range(nframes)],
        "features": featmap,
        "bounds": "bounds.json",
        "times": "times.json",
        "tracks": "tracks.json",
        "centroids": "centroids.json",
        "outliers": "outliers.json",
    }
    with open(out_path + "/manifest.json", "w") as f:
        json.dump(js, f)


def main():
    make_dataset()


if __name__ == "__main__":
    main()
