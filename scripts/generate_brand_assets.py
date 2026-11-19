#!/usr/bin/env python3
"""Export Lyora Fold PNG masters for this app or landing repository.

Requires Pillow. Run from any directory; paths are relative to this script.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / 'branding'
RESAMPLE = Image.Resampling.LANCZOS


def master(name, trim=False):
    image = Image.open(BRAND / f'fold-{name}.png').convert('RGBA')
    if trim:
        # Trim layout whitespace only; keep the approved alpha and artwork intact.
        bounds = image.getchannel('A').point(lambda a: 255 if a > 128 else 0).getbbox()
        image = image.crop(bounds)
    return image


def export(image, path, size=None, background=None, inset=0):
    target = Image.new('RGBA', size or image.size, background or (0, 0, 0, 0))
    fitted = image.copy()
    fitted.thumbnail((target.width - inset * 2, target.height - inset * 2), RESAMPLE)
    target.alpha_composite(fitted, ((target.width - fitted.width) // 2, (target.height - fitted.height) // 2))
    path.parent.mkdir(parents=True, exist_ok=True)
    (target.convert('RGB') if background else target).save(path, optimize=True)


def main():
    horizontal = master('horizontal', trim=True)
    primary = master('primary', trim=True)
    symbol = master('symbol', trim=True)
    icon = master('app-icon')
    if (ROOT / 'pubspec.yaml').exists():
        export(horizontal, ROOT / 'assets/icons/lyora_fold_horizontal.png')
        export(primary, ROOT / 'assets/icons/lyora_fold_primary.png')
        export(symbol, ROOT / 'assets/icons/lyora_mark.png')
        catalog = ROOT / 'ios/Runner/Assets.xcassets/AppIcon.appiconset'
        entries = json.loads((catalog / 'Contents.json').read_text())['images']
        for entry in entries:
            if 'filename' not in entry:
                continue
            side = round(float(entry['size'].split('x')[0]) * float(entry['scale'][:-1]))
            export(icon, catalog / entry['filename'], (side, side), '#FCF8F5')
        launches = ROOT / 'ios/Runner/Assets.xcassets/LaunchImage.imageset'
        for scale, suffix in [(1, ''), (2, '@2x'), (3, '@3x')]:
            export(primary, launches / f'LaunchImage{suffix}.png', (260 * scale, 237 * scale), inset=20 * scale)
        densities = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
        for density, scale in densities.items():
            directory = ROOT / 'android/app/src/main/res' / f'mipmap-{density}'
            side = round(48 * scale)
            export(icon, directory / 'ic_launcher.png', (side, side), '#FCF8F5')
            export(symbol, directory / 'ic_launcher_foreground.png', (side, side), inset=round(side * .18))
            export(primary, directory / 'launch_image.png', (round(260 * scale), round(237 * scale)), inset=round(20 * scale))
    else:
        export(horizontal, ROOT / 'assets/lyora-fold-horizontal.png')
        export(primary, ROOT / 'assets/lyora-fold-primary.png')
        export(symbol, ROOT / 'assets/lyora-fold-symbol.png')
        export(icon, ROOT / 'assets/lyora-icon.png', (600, 600), '#FCF8F5')
        export(icon, ROOT / 'assets/apple-touch-icon.png', (180, 180), '#FCF8F5')
        # Larger optical size at 32px so the Fold remains recognizable in a tab.
        export(symbol, ROOT / 'assets/favicon-32.png', (32, 32), '#FCF8F5', inset=3)


if __name__ == '__main__':
    main()
