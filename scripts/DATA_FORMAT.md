# Nucmorph-Colorizer Data Format

Nucmorph-Colorizer can only load datasets that follow the defined data specification.

The easiest way to get started is to modify one of our existing data processing scripts, like [`generate_data.py`](./timelapse-colorizer-data/generate_data.py)!

## Format Overview

Here are a few important terms:

- **Track**: A segmented object that has been tracked across one or more frames in the time series.
- **Dataset**: A dataset is a single time-series, and can have any number of tracked objects and features.
- **Collection**: An arbitrary grouping of datasets.

### Dataset

A dataset consists of a series of files

### Collections

Collections are defined by an optional JSON file and group one or more datasets for easy access. By default, they should be named `collection.json`.

Collections are an array of JSON objects, each of which define the `name` (an **alias**) and the `path` of a dataset. This can either be a relative path on a file server, or a complete URL\*.

```
[
    { "name": <some_name_1>, "path": <some_path_1>},
    { "name": <some_name_2>, "path": <some_path_2>},
    ...
]
```

For example, let's say a collection is located at `http://example.com/data/collection.json`, and my `collection.json` contains this:

```
[
  { "name": "Mama Bear", "path": "mama_bear" },
  { "name": "Baby Bear", "path": "nested/baby_bear" },
  { "name": "Babiest Bear", "path": "babiest_bear/dataset.json" },
  { "name": "Goldilocks", "path": "http://example2.com/files/goldilocks" },
  { "name": "Papa Bear", "path": "http://example3.com/files/papa_bear.json"}
]
```

Here's a list of where Nucmorph-Colorizer will check for the manifest files for all of the datasets:

| Dataset      | Expected URL Path                                      |
| ------------ | ------------------------------------------------------ |
| Mama Bear    | http://example.com/data/mama_bear/manifest.json        |
| Baby Bear    | http://example.com/data/nested/baby_bear/manifest.json |
| Babiest Bear | http://example.com/data/babiest_bear/dataset.json      |
| Goldilocks   | http://example2.com/files/goldilocks/manifest.json     |
| Papa Bear    | http://example3.com/files/papa_bear.json               |

\*Note: There _is_ also support for loading dataset URLs from network filesystem paths, but this is currently untested and is not recommended.

## Getting Started
