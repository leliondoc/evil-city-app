"""Copy the small courtyard decorations unchanged from Tiny Swords Update 010."""
import io
import json
import sys
from pathlib import Path
from zipfile import ZipFile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest_path = ROOT / 'app/game/assets.json'
manifest = json.loads(manifest_path.read_text())
assets = {
    'yard-mushroom-small': 1, 'yard-mushroom': 2,
    'yard-bush': 7, 'yard-plant': 10, 'yard-leaves': 11,
    'yard-pumpkin': 12, 'yard-pumpkins': 13,
    'yard-bone': 14, 'yard-bone-small': 15, 'yard-skull-sign': 16,
}
with ZipFile(sys.argv[1]) as archive:
    for key, number in assets.items():
        data = archive.read(f'Tiny Swords (Update 010)/Deco/{number:02}.png')
        image = Image.open(io.BytesIO(data)).convert('RGBA')
        width, height = image.size
        bottom = image.getbbox()[3]
        (ROOT / f'public/tiny-swords/{key}.png').write_bytes(data)
        manifest[key] = dict(src=f'/tiny-swords/{key}.png', width=width, height=height,
                             frameWidth=width, frames=1, anchor=bottom / height)
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
