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


def make_dataset(output_dir="./data/", dataset="dataset0", nframes=10, nfeatures=2):
    os.makedirs(output_dir + dataset, exist_ok=True)
    xres = 360
    yres = 240
    for i in range(nframes):
        # make a fake segmentation
        seg2d = np.zeros((yres, xres), dtype=np.uint32)
        cellsperframe = (xres // 10) * (yres // 10)
        for j in range(yres // 10):
            for k in range(xres // 10):
                seg2d[j * 10 : j * 10 + 10, k * 10 : k * 10 + 10] = (
                    (cellsperframe * i) + j * 10 + k
                )

        # convert data to RGBA
        seg_rgba = np.zeros((yres, xres, 4), dtype=np.uint8)
        seg_rgba[:, :, 0] = (seg2d & 0x000000FF) >> 0
        seg_rgba[:, :, 1] = (seg2d & 0x0000FF00) >> 8
        seg_rgba[:, :, 2] = (seg2d & 0x00FF0000) >> 16
        seg_rgba[:, :, 3] = 255  # (seg2d & 0xFF000000) >> 24
        img = Image.fromarray(seg_rgba)  # new("RGBA", (xres, yres), seg2d)
        img.save(output_dir + dataset + "/frame_" + str(i) + ".png")

    totalcells = cellsperframe * nframes

    for i in range(nfeatures):
        # create a fake feature in a random range:
        fmin = 92.1
        fmax = 437.8
        feature = (fmax - fmin) * np.random.random_sample((totalcells,)) + fmin
        true_fmin = np.min(feature)
        true_fmax = np.max(feature)
        js = {"data": feature.tolist(), "min": true_fmin, "max": true_fmax}
        with open(output_dir + dataset + "/feature_" + str(i) + ".json", "w") as f:
            json.dump(js, f)

    # write some kind of manifest
    featmap = {}
    for i in range(nfeatures):
        featmap["feature_" + str(i)] = "feature_" + str(i) + ".json"
    js = {
        "frames": ["frame_" + str(i) + ".png" for i in range(nframes)],
        "features": featmap,
    }
    with open(output_dir + dataset + "/manifest.json", "w") as f:
        json.dump(js, f)


def main():
    make_dataset()


if __name__ == "__main__":
    main()
