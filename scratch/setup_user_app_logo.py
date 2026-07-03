import os
from PIL import Image

src_img = r"d:\pyoneer\public\logo.png"
if not os.path.exists(src_img):
    print("Source image not found!")
    exit(1)

img = Image.open(src_img)

sizes = {
    "mipmap-mdpi": (48, 48),
    "mipmap-hdpi": (72, 72),
    "mipmap-xhdpi": (96, 96),
    "mipmap-xxhdpi": (144, 144),
    "mipmap-xxxhdpi": (192, 192),
}

base_res = r"d:\pyoneer\pyoneer-user-app\android\app\src\main\res"

for folder, size in sizes.items():
    folder_path = os.path.join(base_res, folder)
    os.makedirs(folder_path, exist_ok=True)
    out_path = os.path.join(folder_path, "ic_launcher.png")
    out_path_round = os.path.join(folder_path, "ic_launcher_round.png")
    
    resized = img.resize(size, Image.Resampling.LANCZOS)
    resized.save(out_path, "PNG")
    resized.save(out_path_round, "PNG")
    print(f"Saved {size} icon to {folder}")

print("✅ User App Android logo updated!")
