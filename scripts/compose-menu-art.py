"""Copy the approved character-free menu artwork without compositing or repainting."""
from pathlib import Path
from shutil import copyfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source' / 'menu'
OUTPUT = ROOT / 'public' / 'menu'


def export_menu_art():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for source, target in (
        ('landscape.png', 'evil-city-nightfall.png'),
        ('portrait.png', 'evil-city-nightfall-portrait.png'),
    ):
        copyfile(SOURCE / source, OUTPUT / target)
        print(f'Exported {target}')


if __name__ == '__main__':
    export_menu_art()
