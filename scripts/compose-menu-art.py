"""Export the approved menu art to WebP; keep the full-resolution PNG masters."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source' / 'menu'
OUTPUT = SOURCE / 'exports'


def export_menu_art():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for source, target in (
        ('landscape.png', 'evil-city-nightfall.webp'),
        ('portrait.png', 'evil-city-nightfall-portrait.webp'),
    ):
        with Image.open(SOURCE / source) as artwork:
            artwork.convert('RGB').save(OUTPUT / target, 'WEBP', quality=90, method=6)
        print(f'Exported {target}: {(OUTPUT / target).stat().st_size:,} bytes')


if __name__ == '__main__':
    export_menu_art()
