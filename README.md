# Timelapse Feature Explorer 🔬🎨

#### A web-based, time-series visualizer for tracked segmented data.

## Description

**Timelapse Feature Explorer is a web tool for interacting with and visualizing features in time-series segmented data**. You can apply color maps and ranges,
switch between features in your dataset, play through your data to observe motion, and view plots showing how feature data change over time!

This project originated from the [Allen Institute for Cell Science (AICS)](https://alleninstitute.org/division/cell-science/) Nuclear Morphogenesis
project and is being updated to support broader use cases. View our [Issues page](https://github.com/allen-cell-animated/nucmorph-colorizer/issues)
for more details about potential future features!

### Builds

**Stable build: [timelapse.allencell.org](https://timelapse.allencell.org)**

**Latest (`main` branch): [https://allen-cell-animated.github.io/nucmorph-colorizer/main/](https://allen-cell-animated.github.io/nucmorph-colorizer/main/)**

![image](https://github.com/allen-cell-animated/nucmorph-colorizer/assets/30200665/81130299-7e75-4fc2-a344-19aba7aae8a5)

### Opening New Datasets

Nucmorph Colorizer-compatible datasets hosted over HTTPS can be loaded directly from the interface! More details can be found in the [data format specification](https://github.com/allen-cell-animated/colorizer-data/blob/main/documentation/DATA_FORMAT.md).

Click the **Load** button in the top right to open a URL.

![image](https://github.com/allen-cell-animated/nucmorph-colorizer/assets/30200665/e2631a78-b0d6-49fc-bb93-cefc94a91a53)

Note: If your dataset is hosted via **HTTP** rather than HTTPS, you'll need to install and run the project locally for security reasons. See below for more help.

## Installation

Installing is optional! You can use the [hosted version of Nucmorph Colorizer](https://dev-aics-dtp-001.int.allencell.org/nucmorph-colorizer/dist/index.html)
to access our existing HTTPS-hosted datasets without installing the project.

**Prerequisites:**

- Node 18 or higher: [https://nodejs.org](https://nodejs.org)
- Python 3 (and optionally, a virtual Python environment)

### Web tool

Clone the project and navigate to the project's root directory in a terminal window or VSCode. Then run:

```bash
npm install
npm run dev
```

This will start a development server you can access from your browser. By default, the server will be hosted at `http://localhost:5173/`.

### Data preprocessing

Data must be preprocessed to work with Timelapse Feature Explorer. We provide a Python package and example scripts in the [`colorizer-data` GitHub repository](https://github.com/allen-cell-animated/colorizer-data).

 [You can read more about the data format specification here.](https://github.com/allen-cell-animated/colorizer-data/blob/main/documentation/DATA_FORMAT.md)

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for information related to developing the code.
