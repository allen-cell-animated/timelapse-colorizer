# Frequently Asked Questions

## Sharing datasets

### Q: How do I share local datasets?

A: Datasets are usually opened locally when using the `tfe-open` CLI command from [`colorizer_data`](https://github.com/allen-cell-animated/colorizer-data), which allows you to view local data. However, local datasets can't be accessed by other users.

To share your dataset, you will need to move it and any files it may need (e.g. segmentation or image files) to a location that other computers can access over HTTPS. This is often done with a hosting server or a cloud storage service.

Examples of hosting services include:

- [Amazon S3 bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/GetStartedWithS3.html)
- [Google Cloud Storage bucket](https://cloud.google.com/storage?hl=en)
- GitHub repository (not recommended as GitHub may impose rate limits)

Your institution may have its own hosting solution for internal-only data.

<details>
<summary><b>[🔍 Instructions for Allen Institute users]</b></summary>

---

Files located on VAST can be shared with other users internally. Users must be connected to the Allen Institute network to access them.

1. If needed, rerun the dataset conversion to output to a folder on VAST. Your segmentations and/or images must also be located on VAST for the dataset to be loaded.
2. Copy the path to your dataset folder on VAST. The path should start with `/allen/aics/` and the directory must contain either a `collection.json` or `manifest.json` file.
3. Follow the steps below, using the path as the URL to your dataset folder.

---

</details>

To open and share your dataset:

1. Copy the URL to your TFE dataset folder. The folder should contain a `collection.json` or `manifest.json` file.
2. Go to the public version of Timelapse Feature Explorer at [https://timelapse.allencell.org/](https://timelapse.allencell.org/).
3. Press **Load** in the top right corner to open the load menu.
4. Paste the URL to your dataset, and click the **Load** button.
5. Once the dataset loads, click **Share** to copy a shareable link to your dataset in Timelapse Feature Explorer.

### Q: How do I share datasets located on VAST with external collaborators?

Datasets will need to be moved to a publicly accessible hosting service or server before they can be shared with external collaborators (e.g., Amazon S3, Google Cloud Storage).

Once the dataset is hosted externally, follow the steps outlined above to load and share the dataset in Timelapse Feature Explorer.
