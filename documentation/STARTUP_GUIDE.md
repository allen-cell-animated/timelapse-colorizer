# Getting started with Nucmorph Colorizer

Timelapse Colorizer is a web tool for interacting with and visualizing features in time-series segmented data!

You can access our hosted version here:

## 1. Opening Datasets and Collections

_insert video here_

Timelapse Colorizer loads data via user-provided URLs. It can load either single datasets or groups of datasets, called collections.

To load a dataset or collection, click the **Load** button on the top of the page and type or paste in the URL.

Try loading this simple example dataset:

```
https://raw.githubusercontent.com/allen-cell-animated/nucmorph-colorizer/main/documentation/example_dataset/manifest.json
```

### Loading custom datasets

You can read more about [our data format in our documentation.](./DATA_FORMAT.md) Datasets and collections must be hosted on a cloud location and accessible over HTTP/HTTPS.

## 2. Interacting with Data

_insert video here_

### 2.1 Datasets and Features

If your dataset has multiple features, you can switch between them via the **Features** dropdown.

### 2.2 Coloring

### 2.3 Playback

### 2.4 Plotting

### 2.5 Searching

### 2.6 View Settings

The **viewer settings** pane allows

**Values outside of range** represents any objects whose current feature value is outside the range set with the value range slider. For example, let's say we have a feature that represents the volume of an object. If an object has a value of 10, but the range is from 4-8, that object would be marked as outside of the range. You can choose how these values are colored on the main canvas.

- **Use color map**: Uses the end colors of the current color map.
- **Use custom color**: Use a custom, solid color for all such values.
- **Hide**: Do not show these objects.

## 3. Exporting Images and Video

_insert video here_

## 4. Feedback

We are always looking for ways to improve Timelapse Colorizer. If things aren't working the way you expect, please let us know by [submitting an issue ticket on our GitHub page.](https://github.com/allen-cell-animated/nucmorph-colorizer/issues)
