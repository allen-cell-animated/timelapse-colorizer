# Timelapse Feature Explorer

**Timelapse Feature Explorer is a web tool for interacting with and visualizing features in time-series segmented data**. You can apply color maps and ranges,
switch between features in your dataset, play through your data to observe motion, and view plots showing how feature data change over time.

This project originated from the [Allen Institute for Cell Science (AICS)](https://alleninstitute.org/division/cell-science/) Nuclear Morphogenesis
project and is being updated to support broader use cases. View our [Issues page](https://github.com/allen-cell-animated/timelapse-colorizer/issues)
for more details about potential future features!

## Builds

**Stable build: [timelapse.allencell.org](https://timelapse.allencell.org)**

**Latest (`main` branch): [https://allen-cell-animated.github.io/timelapse-colorizer/](https://allen-cell-animated.github.io/timelapse-colorizer/)**

![image](https://github.com/allen-cell-animated/timelapse-colorizer/assets/30200665/81130299-7e75-4fc2-a344-19aba7aae8a5)

## Viewing Custom Datasets

Datasets must be preprocessed for viewing in Timelapse Feature Explorer. We provide the [`colorizer-data` Python package](https://github.com/allen-cell-animated/colorizer-data), which includes tutorials and documentation about the data specification. See our [getting started guide](https://github.com/allen-cell-animated/colorizer-data/blob/main/documentation/getting_started_guide/GETTING_STARTED.ipynb) for more details.

Compatible datasets hosted over HTTPS can be loaded directly from the interface. Click the **Load** button in the top right to open a URL.

![image](https://github.com/allen-cell-animated/timelapse-colorizer/assets/30200665/e2631a78-b0d6-49fc-bb93-cefc94a91a53)

Note: If your dataset is hosted via **HTTP** rather than HTTPS, you'll need to install and run the project locally for security reasons. See below for more help.

## Installation

Installation is optional and is only necessary for accessing datasets via HTTP. You can use the [hosted version of Timelapse Feature Explorer](https://timelapse.allencell.org)
to access HTTPS-hosted datasets without installing the project.

**Prerequisites:**

- Node 18 or higher: [https://nodejs.org](https://nodejs.org)
- Python 3 (and optionally, a virtual Python environment)

### Web tool

Open a command terminal and run the following commands. Installation may take a few minutes.

```bash
git clone https://github.com/allen-cell-animated/timelapse-colorizer.git
cd timelapse-colorizer
npm install
```

To start the development server, run:

```bash
npm run dev
```

This will allow you to access the viewer from your browser. By default, the server will be hosted at `http://localhost:5173/`.

You can also access our internal build (which may have some additional experimental features) by running `npm run dev-internal`.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for information related to developing the code.
