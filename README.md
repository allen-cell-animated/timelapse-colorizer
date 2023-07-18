# Nucmorph-Colorizer 🔬🎨

#### A web visualizer for time-sequence data from the Nuclear Morphogenesis project.

## Description

Nucmorph-Colorizer is a web tool for interacting with data from the nuclear morphogenesis project! You can apply color maps and ranges,
switch between features, play frames to observe motion, and view plots showing how features change over time.

![image](https://github.com/allen-cell-animated/nucmorph-colorizer/assets/30200665/d9d22cba-faa0-4366-a647-973bc2fce360)

## Installation

**Prerequisites:**

- Node
- Python 3 (and optionally, a virtual Python environment)

Clone this git repository.

### Web tool

Navigate to the project's root directory in a terminal window.

```
npm install
npm run dev
```

This will start a development server you can access from your browser. By default, the server will be hosted at `http://localhost:5173/`.

### Data preprocessing

Data must be preprocessed to work with Nucmorph-Colorizer. [You can read more about the data format specification here.](./scripts/timelapse-colorizer-data/generate_data.py). Utilities are included in this repository to convert standard time-series data.

For loading of datasets to work correctly, you'll need to run these commands from a device that has access to Allen Institute's on-premises data storage. If running off of shared resources, remember to initialize your virtual environment first. This may look like `conda activate {my_env}`.

Navigate to the project's scripts directory.

```
cd scripts/

pip install .
```

The `generate_data.py` script can take in a named dataset (like `baby_bear`, `mama_bear`, or `goldilocks`) and convert it to a format readable
by the web client.

```
python timelapse-colorizer-data/generate_data.py --output_dir {output_dir} --dataset {dataset_name}
```

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for information related to developing the code.
