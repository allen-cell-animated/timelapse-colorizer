# Nucmorph-Colorizer Data Format

Nucmorph-Colorizer can only load datasets that follow the defined data specification.

The easiest way to get started is to modify one of our existing data processing scripts, like [`generate_data.py`](./timelapse-colorizer-data/generate_data.py)!

## Terms

Here are a few important terms:

- **Track**: A segmented object that has been tracked across one or more frames in the time series.
- **Dataset**: A dataset is a single time-series, and can have any number of tracked objects and features.
- **Collection**: An arbitrary grouping of datasets.

## Dataset

A dataset consists of a group of files that describe the tracks, feature data, processed images, and additional metadata for a single time-series.

The most important file is the **manifest**, which describes all the files in the dataset.

```
--manifest.json--
{
    "frames": [
        <relative path to image frame 0>,
        <relative path to image frame 1>,
        ...
    ],
    "features": {
        <feature name 1>: <relative path to feature JSON>,
        <feature name 2>: <relative path to feature JSON>,
        ...
    },
    "outliers": <relative path to outlier JSON>,
    "tracks": <relative path to tracks JSON>,
    "times": <relative path to times JSON>,
    "centroids": <relative path to centroids JSON>,
    "bounds": <relative path to bounds JSON>
}

*Note: all paths are relative to this JSON file
```

<details>
<summary><b>Show me an example!</b></summary>
An example dataset directory could look like this:

```
📂 my_dataset/
  - 📄 manifest.json
  - 📄 outliers.json
  - 📄 tracks.json
  - 📄 times.json
  - 📄 centroids.json
  - 📄 bounds.json
  - 📕 feature_0.json
  - 📗 feature_1.json
  - 📘 feature_2.json
  - 📁 frames/
    - 📷 frame_0.png
    - 📷 frame_1.png
    - 📷 frame_2.png
    ...
    - 📷 frame_245.png
```

The `manifest.json` file would look something like this:

```
--manifest.json--
{
    "frames": [
        "frames/frame_0.png",
        "frames/frame_1.png",
        "frames/frame_2.png",
        ...
        "frames/frame_245.png",
    ],
    "features": {
        "My Cool Feature": "feature_0.json",
        "Another Cool Feature": "feature_1.json",
        "The Coolest Feature": "feature_2.json",
    },
    "outliers": "outliers.json",
    "tracks": "tracks.json",
    "times": "times.json",
    "centroids": "centroids.json",
    "bounds": "bounds.json"
}
```

</details>

### Tracks

Every segmented object in each time step has a **track ID**, an integer identifier that's unique across all time steps. To recognize a single track across multiple frames, these track IDs must be grouped together with a single **track number**.

A **track JSON file** consists of a JSON object with a `data` array, where for each track ID `i`, `data[i]` is the track number that track ID is part of.

```
--track.json--
{
    "data": [
        <track number for id 0>,
        <track number for id 1>,
        <track number for id 2>,
        ...
    ]
}
```

<details>
<summary><b>Show me an example!</b></summary>
For example, if there were the following two tracks in some dataset, the track file might look something like this.

| Track # | Track IDs |
| ------- | --------- |
| 1       | 0, 1, 4   |
| 2       | 2, 3, 5   |

```
--track.json--
{
    "data": [
        1, // 0
        1, // 1
        2, // 2
        2, // 3
        1, // 4
        2  // 5
    ]
}
```

</details>

### Times

The times JSON is similar to the tracks JSON. It also contains a `data` array that maps from track IDs to the frame number that they appear on.

```
--times.json--
{
    "data": [
        <frame number for track id 0>,
        <frame number for track id 1>,
        <frame number for track id 2>,
        ...
    ]
}
```

### Frames

_Example frame:_
![](./documentation/frame_0.png)
_Each unique color in this frame is a different track ID._

**Frames** are image textures that store the track IDs for each time step in the time series. Each pixel in the image can encode a single track ID in its RGB value (`= R + G*256 + B*256*256`). Note that there is currently no way to indicate overlaps in the data-- your script will need to flatten 3D data and segmentations.

There should be one frame for every time step in the time series, and they must all be listed in order in the **manifest** file.

### Features

Datasets can contain any number of features, which are a numeric value assigned to each track ID in the dataset. Each feature file usually corresponds to a single column of data.

Features must also provide a `min` and `max` range property.

```
--feature1.json--
{
    "data": [
        <feature value for track id 0>,
        <feature value for track id 1>,
        <feature value for track id 2>,
        ...
    ],
    "min": <min value for all features>,
    "max": <max value for all features>
}
```

### Centroids

The centroids file defines the center of each track ID in the dataset. For each index `i`, the coordinates are `(x: data[2i], y: data[2i + 1])`.
Coordinates are defined in pixels in the frame, where the upper left corner of the frame is (0, 0).

```
--centroids.json--
{
    "data": [
        <x coordinate for track id 0>,
        <y coordinate for track id 0>,
        <x coordinate for track id 1>,
        <y coordinate for track id 1>,
        ...
    ]
}
```

### Bounds

The bounds file defines the rectangular boundary occupied by each track ID. For each track ID `i`, the minimum bounding box coordinates (upper left corner) are given by
`(x: data[4i], y: data[4i + 1])`, and the maximum bounding box coordinates (lower right corner) are given by `(x: data[4i + 2], y: data[4i + 3])`.

Again, coordinates are defined in pixels in the image frame, where the upper left corner is (0, 0).

```
--bounds.json--
{
    "data": [
        <upper left x for track id 0>,
        <upper left y for track id 0>,
        <lower right x for track id 0>,
        <lower right y for track id 0>,
        <upper left x for track id 1>,
        <upper left y for track id 1>,
        ...
    ]
}
```

### Outliers

The outliers file stores marks whether a given track ID should be marked as an outlier using an array of booleans (`true`/`false`). Indices that are `true` indicate outlier values, and are given a unique color in Nucmorph-Colorizer.

```
--outliers.json--
{
    "data": [
        <whether track id 0 is an outlier>,
        <whether track id 1 is an outlier>,
        <whether track id 2 is an outlier>,
        ...
    ]
}
```

<details>
<summary><b>Show me an example!</b></summary>
For example, if a dataset had the following tracks and outliers, the file might look something like this.

| Track # | Track IDs | Outliers |
| ------- | --------- | -------- |
| 1       | 0, 1, 4   | 1        |
| 2       | 2, 3, 5   | 2, 5     |

```
--outliers.json--
{
    "data": [
        false, // 0
        true,  // 1
        true,  // 2
        false, // 3
        false, // 4
        true   // 5
    ]
}
```

</details>

## Collections

Collections are defined by an optional JSON file and group one or more datasets for easy access. By default, they should be named `collection.json`.

Collections are an array of JSON objects, each of which define the `name` (an **alias**) and the `path` of a dataset. This can either be a relative path on a file server, or a complete URL.

```
--collection.json--
[
    { "name": <some_name_1>, "path": <some_path_1>},
    { "name": <some_name_2>, "path": <some_path_2>},
    ...
]
```

<details>
<summary><b>Show me an example!</b></summary>

For example, let's say a collection is located at `http://example.com/data/collection.json`, and the `collection.json` contains this:

```
--collection.json--
[
  { "name": "Mama Bear", "path": "mama_bear" },
  { "name": "Baby Bear", "path": "nested/baby_bear" },
  { "name": "Babiest Bear", "path": "babiest_bear/dataset.json" },
  { "name": "Goldilocks", "path": "http://example2.com/files/goldilocks" },
  { "name": "Papa Bear", "path": "http://example3.com/files/papa_bear.json"}
]
```

Here's a list of where Nucmorph-Colorizer will check for the manifest files for all of the datasets:

| Dataset      | Expected URL Path                                        |
| ------------ | -------------------------------------------------------- |
| Mama Bear    | `http://example.com/data/mama_bear/manifest.json`        |
| Baby Bear    | `http://example.com/data/nested/baby_bear/manifest.json` |
| Babiest Bear | `http://example.com/data/babiest_bear/dataset.json`      |
| Goldilocks   | `http://example2.com/files/goldilocks/manifest.json`     |
| Papa Bear    | `http://example3.com/files/papa_bear.json`               |

---

</details>

## Getting Started

For most datasets, the easiest way to get started is to modify one of the existing data generation scripts, like [`generate_data.py`](./timelapse-colorizer-data/generate_data.py).

(Check with your team or one of the developers on the Animated Cell team to see if there's already a data generation script for your project!)
