
# Image Cropping Prompt

Please crop the `{input_path_name}` file to show just the `{description_of_object_to_crop}`. Create the cropped image at `{cropped_path_name}`.

## Prerequisites
Make sure you can see the image. Do not proceed if you can't visualize the image.

## Steps to Calculate the Crop Area

1. **Get the image dimensions** - Use the metadata tool to determine width and height

2. **Apply 5×5 grid analysis** - Imagine a 5×5 grid overlaid on the image using the reference table below

3. **Identify object boundaries** - Locate the {description_of_object_to_crop} and determine:
   - **Top-left cell**: Which grid cell contains the top-left corner of the object you want to crop
     - Look for the absolute leftmost and topmost pixel of the object
     - Be precise about which grid cell this corner actually falls within
   - **Bottom-right cell**: Which grid cell contains the bottom-right corner of the object you want to crop
     - Look for the absolute rightmost and bottommost pixel of the object
   - **Visual verification**: Describe what you see in the identified cells to confirm accuracy
   - Include any cells the object is "close to" or partially intersects

4. **Calculate crop coordinates** - Convert the identified cell range into pixel coordinates:
   - **Verify your grid analysis**: Before calculating, double-check your cell identification by describing what you observe in each identified cell
   - Calculate cell dimensions: `cell_width = image_width / 5`, `cell_height = image_height / 5`
   - Calculate crop area using the top-left and bottom-right cells identified above
   - **Coordinate calculation**:
     - Left = (top-left column - 1) × cell_width
     - Top = (top-left row - 1) × cell_height  
     - Right = (bottom-right column) × cell_width
     - Bottom = (bottom-right row) × cell_height
     - Width = Right - Left
     - Height = Bottom - Top

5. **Perform the crop** - Use the calculated coordinates to crop the image


## 5×5 Grid Reference Table

Use this table to describe cell locations when identifying the object boundaries:

|   | **Col 1<br>Left** | **Col 2<br>Left-center** | **Col 3<br>Center** | **Col 4<br>Right-center** | **Col 5<br>Right** |
|---|---|---|---|---|---|
| **Row 1<br>Top** | Top-left | Top left-center | Top-center | Top right-center | Top-right |
| **Row 2<br>Upper-middle** | Upper-middle left | Upper-middle left-center | Upper-middle center | Upper-middle right-center | Upper-middle right |
| **Row 3<br>Center** | Center-left | Center left-center | Center-center | Center right-center | Center-right |
| **Row 4<br>Lower-middle** | Lower-middle left | Lower-middle left-center | Lower-middle center | Lower-middle right-center | Lower-middle right |
| **Row 5<br>Bottom** | Bottom-left | Bottom left-center | Bottom-center | Bottom right-center | Bottom-right |

## Example Usage

```
{input_path_name} = "/path/to/source/image.png"
{cropped_path_name} = "/path/to/output/cropped_image.png" 
{description_of_object_to_crop} = "pagination controls"
```