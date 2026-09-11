"""Copy unchanged originals: python3 scripts/import-goblin-upgrades.py ENEMY.zip FREE_DIRECTORY."""
import json
import struct
import sys
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
manifest_path = ROOT / 'app/game/assets.json'
manifest = json.loads(manifest_path.read_text())

def copy(key, data, frame_width, anchor):
    width, height = struct.unpack_from('>II', data, 16)
    assert width % frame_width == 0
    (ROOT / f'public/tiny-swords/{key}.png').write_bytes(data)
    manifest[key] = dict(src=f'/tiny-swords/{key}.png', width=width, height=height,
                         frameWidth=frame_width, frames=width // frame_width, anchor=anchor)

with ZipFile(sys.argv[1]) as pack:
    prefix = 'Tiny Swords (Enemy Pack)/Enemy Pack/'
    for action, suffix in [('idle', 'Idle'), ('walk', 'Run'), ('attack', 'Attack Fast')]:
        copy(f'spear-goblin-{action}', pack.read(prefix + f'Spear Goblin/Spear Goblin_{suffix}.png'), 256, .67)
    copy('spear-goblin-avatar', pack.read(prefix + 'Spear Goblin/Spear Goblin_Avatar.png'), 256, .67)
    for action, suffix in [('idle', 'Idle'), ('walk', 'Run'), ('attack', 'Attack')]:
        copy(f'pig-rider-{action}', pack.read(prefix + f'Extra/Pig Rider Spear Goblin/Pig Rider_{suffix}.png'), 256, .64)
    for action, suffix in [('idle', 'Idle'), ('walk', 'Run')]:
        copy(f'pig-{action}', pack.read(prefix + f'Extra/Pig/Pig_{suffix}.png'), 192, .67)
    copy('troll-house', pack.read(prefix + 'Extra/Dead Tree/Dead Tree.png'), 384, .94)
    copy('cave', pack.read(prefix + 'Extra/Cave/Cave_Idle.png'), 192, .78)
copy('ui-hammer', (Path(sys.argv[2]) / 'UI Elements/UI Elements/Icons/Icon_01.png').read_bytes(), 64, .5)
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
