# Crop Image

A single prompt that precisely crops an image to a described object or region, using a 5×5 grid analysis to calculate crop coordinates without needing pixel-perfect vision.

## What this does

Given an image and a description of what to crop, the prompt:

1. Reads the image's dimensions
2. Overlays a 5×5 grid and identifies which cells contain the target object's top-left and bottom-right corners
3. Converts that grid range into pixel coordinates
4. Performs the crop

## How to run it

Paste the contents of [`crop-image.md`](./crop-image.md) into your AI agent, filling in:

- `{input_path_name}` – path to the source image
- `{description_of_object_to_crop}` – what to crop to (e.g. "the navigation bar")
- `{cropped_path_name}` – where to save the cropped image

Your agent needs the ability to view the image and run a crop/image-metadata tool.
