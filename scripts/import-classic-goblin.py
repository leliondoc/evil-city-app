"""Extract the original purple Torch goblin frames from the Update 010 sheet.

Usage: python3 scripts/import-classic-goblin.py 'Tiny Swords.zip'
Requires Pillow. Pixels are copied unchanged; only animation rows are separated.
"""
import io
import json
import sys
from pathlib import Path
from zipfile import ZipFile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest_path = ROOT / 'app/game/assets.json'
manifest = json.loads(manifest_path.read_text())
with ZipFile(sys.argv[1]) as archive:
    sheet = Image.open(io.BytesIO(archive.read(
        'Tiny Swords (Update 010)/Factions/Goblins/Troops/Torch/Purple/Torch_Purple.png'
    ))).convert('RGBA')
assert sheet.size == (1344, 960)
# Exported rows: Idle, Run, Attack_Right, Attack_Down, Attack_Up.
for action, row, frames in [('idle', 0, 7), ('walk', 1, 6), ('attack', 2, 6)]:
    key = f'goblin-{action}'
    sheet.crop((0, row * 192, frames * 192, (row + 1) * 192)).save(ROOT / f'public/tiny-swords/{key}.png')
    manifest[key] = dict(src=f'/tiny-swords/{key}.png', width=frames * 192,
                         height=192, frameWidth=192, frames=frames, anchor=.67)
    manifest[f'bestiary-{key}'] = dict(manifest[key])
# The old pack has no separate avatar. Use its original idle pose with tight,
# square transparent padding so the HUD shows the same goblin as the map.
pose = sheet.crop((0, 0, 192, 192))
left, top, right, bottom = pose.getbbox()
size = max(right - left, bottom - top) + 8
x = (left + right - size) // 2
y = (top + bottom - size) // 2
pose.crop((x, y, x + size, y + size)).save(ROOT / 'public/tiny-swords/goblin-avatar.png')
manifest['goblin-avatar'] = dict(src='/tiny-swords/goblin-avatar.png', width=size,
                                height=size, frameWidth=size, frames=1, anchor=.67)
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
