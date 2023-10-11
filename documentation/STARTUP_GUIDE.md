# Getting started with Timelapse Colorizer

Timelapse Colorizer is a web tool for interacting with and visualizing features in time-series segmented data!

You can access our hosted version here:

## 1. Opening Datasets and Collections

_insert video here_

Timelapse Colorizer loads data via user-provided URLs. It can load either single datasets or groups of datasets, called collections.

To load a dataset or collection, click the **Load** button on the top of the page and type or paste in the URL.

Try loading this example dataset:

```
https://raw.githubusercontent.com/allen-cell-animated/nucmorph-colorizer/main/documentation/example_dataset/manifest.json
```

### Loading custom datasets

You can read more about [our data format in our documentation.](./DATA_FORMAT.md) Datasets and collections must be hosted on a cloud location and accessible over HTTP/HTTPS.

## 2. Interacting with Data

_insert video here_

### 2.1 Datasets and Features

If you loaded a collection, you'll see each dataset appear as an option in the **Dataset** dropdown at the top of the screen. Selecting one will open it.

If your dataset has multiple features, you can switch between them via the **Features** dropdown.

### 2.2 Coloring

Objects onscreen will be colored using the selected **Color map**, which you can also change via the dropdown.

### 2.3 Playback

You can start or stop playback via the buttons at the bottom of the data view, or scrub through different timesteps using the slider or provided buttons.

### 2.4 Tracks and Plotting

You can hover your mouse over any object in the data view to see its current feature value and its **track ID**, the unique number identifier for all timesteps.

Clicking on any object in the data view to select the **track**, highlighting it. The **Plot** view will update to show you how its feature value change across its lifetime.

### 2.5 Searching

If you want to find a known track by its ID, you can type into the **Search box** on the plot pane. Enter the track ID and press the button to search. If the dataset contains the track, it will jump to the very first frame that the object appears.

### 2.6 View Settings

The **viewer settings** pane allows you to set options for how the visualizer works.

**Values outside of range** represent any objects whose current feature value is outside the range set with the value range slider. For example, let's say we have a feature that represents the volume of an object. If an object has a value of 10, but the range is from 4-8, that object would be marked as outside of the range. You can choose how these values are colored on the main data view.

- **Use color map**: Uses the end colors of the current color map.
- **Use custom color**: Use a custom, solid color for all such values.
- **Hide**: Do not show these objects.

You can also set these for **outliers**, which are marked in the dataset itself.

To see how any object moves over time, check the **Show track path** option and then select the object by clicking it in the data view. This will show a line trail that updates as the object moves over time.

## 3. Exporting Images and Video

_insert video here_

If you want to share the visualization, click on the **Export** button at the top of the screen to open the export menu.

You can export the visualization as either a PNG image sequence or as an MP4 video on supported browsers.\*

_\*At the time of writing (October 11th, 2023), Firefox browsers do not support the MP4 video export feature yet. Please try another browser if you need to export video!_

## 4. Feedback

We are always looking for ways to improve Timelapse Colorizer. If things aren't working the way you expect, please let us know by [submitting an issue ticket on our GitHub page.](https://github.com/allen-cell-animated/nucmorph-colorizer/issues)
