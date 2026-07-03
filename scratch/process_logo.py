import os
import shutil
from PIL import Image

src_img = r"C:\Users\spkch\.gemini\antigravity\brain\ce56ad2a-bfa7-45d8-a43b-4f7a272f75a0\media__1783011248545.png"
public_dir = r"d:\pyoneer\public"

if not os.path.exists(src_img):
    print("Error: Source image not found at", src_img)
    exit(1)

# Open image
img = Image.open(src_img)
print(f"Original image size: {img.size}, mode: {img.mode}")

# Save full res logo as logo.png
logo_path = os.path.join(public_dir, "logo.png")
img.save(logo_path, "PNG")
print("Saved full logo to", logo_path)

# Resize for favicon.png (64x64)
fav_png_path = os.path.join(public_dir, "favicon.png")
img_64 = img.resize((64, 64), Image.Resampling.LANCZOS)
img_64.save(fav_png_path, "PNG")
print("Saved favicon.png to", fav_png_path)

# Resize for icon.png (192x192)
icon_png_path = os.path.join(public_dir, "icon.png")
img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
img_192.save(icon_png_path, "PNG")
print("Saved icon.png to", icon_png_path)

# Resize for apple-touch-icon.png (180x180)
apple_path = os.path.join(public_dir, "apple-touch-icon.png")
img_180 = img.resize((180, 180), Image.Resampling.LANCZOS)
img_180.save(apple_path, "PNG")
print("Saved apple-touch-icon.png to", apple_path)

# Save favicon.ico (multiple sizes: 16x16, 32x32, 48x48, 64x64)
fav_ico_path = os.path.join(public_dir, "favicon.ico")
img.save(fav_ico_path, format="ICO", sizes=[(16,16), (32,32), (48,48), (64,64)])
print("Saved favicon.ico to", fav_ico_path)

print("ALL RESIZING AND SAVING COMPLETE!")
