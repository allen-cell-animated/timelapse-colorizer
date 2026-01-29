# Frequently Asked Questions

## Sharing datasets

### Q: How do I share my datasets from a local instance of Timelapse Feature Explorer?

A: You'll need to ensure both the instance of Timelapse Feature Explorer you are using and the dataset itself can be accessed by your collaborators.

Timelapse Feature Explorer can be run locally to view local files (e.g. with the `tfe-open` command from `colorizer_data`). This works great for quick exploration of your data, but other users will not be able to access the dataset.

You will need to move your dataset to a location that other computers can access over HTTPS. This is often done with a hosting server or cloud storage service.

Examples of hosting services include:

- [Amazon S3 bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/GetStartedWithS3.html)
- [Google Cloud Storage bucket](https://cloud.google.com/storage?hl=en)
- GitHub repository (not recommended as GitHub may impose rate limits)

Your institution may have its own hosting solution for internal-only data.

<details>
<summary><b>[🔍 Instructions for Allen Institute users]</b></summary>

---

Files located on the VAST filesystem can be shared with other users internally. Users must be connected to the Allen Institute network to access it.

1. If needed, rerun the dataset conversion to output to the VAST filesystem. Your segmentations/images must also be located on VAST for the dataset to be loaded correctly.
2. Copy the path to your dataset folder on VAST. The path should start with `/allen/aics/` and the directory must contain either a `collection.json` or `manifest.json` file.
3. Follow the steps below, using the VAST path as the URL to your dataset folder.

---

</details>
<br/>

To open and share your dataset:

1. Copy the URL to your TFE dataset folder. The folder should contain a `collection.json` or `manifest.json` file.
2. Go to the public version of Timelapse Feature Explorer at [https://timelapse.allencell.org/](https://timelapse.allencell.org/).
3. Press **Load** in the top right corner to open the load menu.
4. Paste the URL to your dataset folder, and click the **Load** button.
5. Once the dataset loads, click **Share** to copy a shareable link to your dataset in Timelapse Feature Explorer.

### Q: How do I share datasets that are located on VAST with external collaborators?

Allen Institute users can share datasets located on the VAST filesystem with external collaborators by first copying the dataset to a publicly accessible hosting service (e.g., Amazon S3, Google Cloud Storage). Once the dataset is hosted externally, follow the steps outlined above to load and share the dataset using Timelapse Feature Explorer.
