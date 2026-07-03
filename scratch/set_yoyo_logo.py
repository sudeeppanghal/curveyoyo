import os
from PIL import Image, ImageOps, ImageDraw

def create_rounded_icon(im, size):
    im_resized = im.resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    rounded = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    rounded.paste(im_resized, (0, 0), mask)
    return rounded

def update_icons(target_android_dir, logo_path='public/logo.png'):
    im = Image.open(logo_path).convert('RGBA')
    sizes = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192,
    }
    
    res_dir = os.path.join(target_android_dir, 'app', 'src', 'main', 'res')
    for folder, size in sizes.items():
        out_dir = os.path.join(res_dir, folder)
        os.makedirs(out_dir, exist_ok=True)
        
        # Standard square/rounded-corner icon
        square = im.resize((size, size), Image.Resampling.LANCZOS)
        square.save(os.path.join(out_dir, 'ic_launcher.png'), 'PNG')
        square.save(os.path.join(out_dir, 'ic_launcher_foreground.png'), 'PNG')
        
        # Round icon
        round_ic = create_rounded_icon(im, size)
        round_ic.save(os.path.join(out_dir, 'ic_launcher_round.png'), 'PNG')
        print(f"Updated {folder} ({size}x{size}) in {out_dir}")

if __name__ == '__main__':
    update_icons('pyoneer-user-app/android')
    print("Successfully set original YoYo SMM logo to mobile app!")
