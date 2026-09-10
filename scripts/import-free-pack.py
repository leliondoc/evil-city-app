"""Copy the selected original Tiny Swords PNGs from an unpacked Free Pack."""
import json
from pathlib import Path
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
manifest_path = ROOT / 'app/game/assets.json'
manifest = json.loads(manifest_path.read_text())

def copy(key, relative, frame_width=None, anchor=.67):
    data = (source / relative).read_bytes()
    width, height = struct.unpack_from('>II', data, 16)
    frame_width = frame_width or width
    assert width % frame_width == 0
    (ROOT / f'public/tiny-swords/{key}.png').write_bytes(data)
    manifest[key] = dict(src=f'/tiny-swords/{key}.png', width=width, height=height,
                         frameWidth=frame_width, frames=width // frame_width, anchor=anchor)

humans = []
for role, original, name, description in [
    ('warrior', 'Warrior', 'Chevalier de l’Aube', 'Le combattant de première ligne de la guilde. Il vise le manoir et affronte vos créatures au corps à corps.'),
    ('lancer', 'Lancer', 'Lancier de l’Aube', 'Un combattant robuste. Sa longue lance lui permet de frapper avant le contact.'),
    ('archer', 'Archer', 'Archère de l’Aube', 'Elle tire de vraies flèches à distance. Les bâtiments bloquent ses lignes de tir.'),
    ('monk', 'Monk', 'Moine de l’Aube', 'Il soigne les membres blessés de son expédition. Éliminez-le pour empêcher les héros de se rétablir.'),
]:
    actions = {}
    for action, suffix in [('idle', 'Idle'), ('walk', 'Run'), ('attack', 'Attack1' if role == 'warrior' else 'Right_Attack' if role == 'lancer' else 'Shoot' if role == 'archer' else 'Heal')]:
        filename = f'{original}_{suffix}.png' if role != 'monk' else f'{suffix}.png'
        key = f'hero-{role}-{action}'
        copy(key, f'Units/Yellow Units/{original}/{filename}', 320 if role == 'lancer' else 192)
        actions[action] = [key]
    humans.append(dict(id=f'hero-{role}', original=original, name=name, description=description,
                       group='humans', recruitable=False, actions=actions))
copy('guard-walk', 'Units/Blue Units/Warrior/Warrior_Run.png', 192)
copy('hero-arrow', 'Units/Yellow Units/Archer/Arrow.png', anchor=.5)
copy('hero-heal', 'Units/Yellow Units/Monk/Heal_Effect.png', 192)
copy('guild-yellow', 'Buildings/Yellow Buildings/Monastery.png', anchor=.94)
for i in range(1, 6):
    copy(f'terrain-{i}', f'Terrain/Tileset/Tilemap_color{i}.png')
for i in range(1, 5):
    copy(f'cloud-{i}', f'Terrain/Decorations/Clouds/Clouds_0{i}.png', anchor=.5)
    copy(f'bush-{i}', f'Terrain/Decorations/Bushes/Bushe{i}.png', 128)
    copy(f'rock-{i}', f'Terrain/Decorations/Rocks/Rock{i}.png')
    copy(f'water-rock-{i}', f'Terrain/Decorations/Rocks in the Water/Water Rocks_0{i}.png', 64)
    copy(f'tree-{i}', f'Terrain/Resources/Wood/Trees/Tree{i}.png', 192, anchor=.8)
copy('sheep', 'Terrain/Resources/Meat/Sheep/Sheep_Grass.png', 128)
copy('gold-rock', 'Terrain/Resources/Gold/Gold Stones/Gold Stone 1.png')
copy('terrain-shadow', 'Terrain/Tileset/Shadow.png')
for color in ['Blue', 'Purple']:
    for i in [2, 3]:
        copy(f'house-{color.lower()}-{i}', f'Buildings/{color} Buildings/House{i}.png', anchor=.94)
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
catalog_path = ROOT / 'app/game/bestiary.json'
catalog = [e for e in json.loads(catalog_path.read_text()) if e['group'] != 'humans']
catalog_path.write_text(json.dumps(catalog + humans, indent=2, ensure_ascii=False) + '\n')
print(f'Imported 4 hero classes, guard movement and terrain. Bestiary: {len(catalog) + len(humans)} entries.')
# Human supply routes: tools while travelling, work cycles and carried resources.
for kind, tool, cargo in [('wood', 'Axe', 'Wood'), ('gold', 'Pickaxe', 'Gold'), ('food', 'Knife', 'Meat')]:
    for action, filename in [('walk', f'Run {tool}'), ('work', f'Interact {tool}'), ('carry', f'Run {cargo}'), ('idle', f'Idle {tool}')]:
        copy(f'pawn-{kind}-{action}', f'Units/Blue Units/Pawn/Pawn_{filename}.png', 192)
ui = 'UI Elements/UI Elements'
for key, relative in {
    'ui-paper': 'Papers/RegularPaper.png', 'ui-banner': 'Banners/Banner.png',
    'ui-wood': 'Wood Table/WoodTable.png', 'ui-ribbons': 'Ribbons/BigRibbons.png',
    'ui-button': 'Buttons/BigBlueButton_Regular.png',
    'ui-button-pressed': 'Buttons/BigBlueButton_Pressed.png',
    'ui-button-red': 'Buttons/BigRedButton_Regular.png',
    'ui-cursor': 'Cursors/Cursor_01.png',
    'ui-gold': 'Icons/Icon_03.png', 'ui-wood-icon': 'Icons/Icon_02.png',
    'ui-food': 'Icons/Icon_04.png', 'ui-sword': 'Icons/Icon_05.png',
    'ui-shield': 'Icons/Icon_06.png',
}.items():
    copy(key, f'{ui}/{relative}')
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
