"""Import the purchased archive into the in-game bestiary, without publishing the archive."""
import json
from pathlib import Path
import struct
import sys
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
NAMES = {
    'Torch Goblin': ('goblin', 'Gobelin bâtisseur', 'Une torche à la main, il construit et récupère du bois.', True),
    'Troll': ('troll', 'Troll', 'Un gros bras dont la frappe se prépare, s’abat, puis laisse place à la récupération.', True),
    'Skull': ('skeleton', 'Squelette', 'Un soldat infatigable qui ne réclame jamais de repas.', True),
    'Minotaur': ('minotaur', 'Minotaure', 'Un colosse de siège gourmand en nourriture et en place.', True),
    'Spear Goblin': ('spear-goblin', 'Gobelin lancier', 'Un gobelin équipé d’une longue lance et d’un bouclier de fortune.', False),
    'Imp': ('imp', 'Diablotin', 'Une petite créature ailée. Son attaque enchaîne préparation, assaut et fin de mouvement.', False),
    'Slingshot Gnome': ('slingshot-gnome', 'Gnome frondeur', 'Un gnome qui préfère sa fronde aux échanges de coups.', False),
    'Turtle': ('turtle', 'Tortue géante', 'Une carapace imposante et une démarche lourde.', False),
    'Bear': ('bear', 'Ours', 'Une masse de fourrure dont les griffes inspirent le respect.', False),
    'Bumblebee': ('bumblebee', 'Bourdon géant', 'Un insecte volant qui fond sur sa cible.', False),
    'Panda': ('panda', 'Panda combattant', 'Un voisin massif, bien plus vif qu’il n’en a l’air.', False),
    'Gnome': ('gnome', 'Gnome', 'Un petit combattant qui manie sa lame avec énergie.', False),
    'Giant Bat': ('giant-bat', 'Chauve-souris géante', 'Une silhouette ailée taillée pour les nuits du quartier.', False),
    'Bomb Fish': ('bomb-fish', 'Poisson artificier', 'Un curieux artilleur qui lance des bombes.', False),
    'Thief': ('thief', 'Spectre', 'Le voleur du pack incarne le spectre : il hante les bâtiments humains et suspend leurs livraisons et renforts. Les moines peuvent le chasser.', True),
    'Hex Shaman': ('hex-shaman', 'Chaman des maléfices', 'Un sorcier masqué qui canalise une magie inquiétante.', False),
    'Lizard': ('lizard', 'Lézard guerrier', 'Un reptile agile, toujours prêt à dégainer.', False),
    'Gnoll': ('gnoll', 'Gnoll', 'Un combattant sauvage qui projette son arme.', False),
    'Spider': ('spider', 'Araignée géante', 'Huit pattes pour explorer les coins oubliés du domaine.', False),
    'Paddle Shark': ('paddle-shark', 'Requin à pagaie', 'Un requin terrestre qui frappe avec sa pagaie.', False),
    'Harpoon Shark': ('harpoon-shark', 'Requin harponneur', 'Un chasseur qui préfère lancer son harpon.', False),
    'Snake': ('snake', 'Serpent', 'Un reptile qui se dresse avant de frapper.', False),
}

def main():
    archive = ZipFile(sys.argv[1])
    manifest_path = ROOT / 'app/game/assets.json'
    manifest = json.loads(manifest_path.read_text())
    catalog = []
    for original, (identifier, name, description, recruitable) in NAMES.items():
        prefix = f'Tiny Swords (Enemy Pack)/Enemy Pack/{original}/'
        files = [p for p in archive.namelist() if p.startswith(prefix) and p.endswith('.png') and '/._' not in p]
        aseprite = archive.read(prefix + original + '.aseprite')
        width, height = struct.unpack_from('<HH', aseprite, 8)
        actions = {}
        for action, suffixes in {
            'idle': ['Idle'], 'walk': ['Walk', 'Run', 'Move'],
            'attack': ['Attack', 'Attack Fast', 'Shoot', 'Throw'],
        }.items():
            chosen = [p for suffix in suffixes for p in files if p.endswith(f'{original}_{suffix}.png')][:1]
            if original == 'Troll' and action == 'attack':
                chosen = [prefix + f'Troll_{part}.png' for part in ('Windup', 'Attack', 'Recovery')]
            if original == 'Imp' and action == 'attack':
                chosen = [prefix + f'Imp_Attack_{part}.png' for part in ('Start', 'Loop', 'End')]
            if not chosen:
                raise ValueError(f'Missing {original} {action}')
            keys = []
            for i, path in enumerate(chosen):
                key = f'bestiary-{identifier}-{action}' + (f'-{i}' if len(chosen) > 1 else '')
                data = archive.read(path)
                png_width, png_height = struct.unpack_from('>II', data, 16)
                assert png_width % width == 0 and png_height == height
                (ROOT / f'public/tiny-swords/{key}.png').write_bytes(data)
                manifest[key] = dict(src=f'/tiny-swords/{key}.png', width=png_width, height=png_height,
                                     frameWidth=width, frames=png_width // width, anchor=.67)
                keys.append(key)
            actions[action] = keys
        catalog.append(dict(id=identifier, original=original, name=name, description=description,
                            group='creatures', recruitable=recruitable, actions=actions))
    for action in ('idle', 'walk', 'attack'):
        manifest[f'specter-{action}'] = dict(manifest[f'bestiary-thief-{action}'])
    # Original looping magic projectile, used as wisps around haunted buildings.
    data = archive.read('Tiny Swords (Enemy Pack)/Enemy Pack/Hex Shaman/Hex Shaman_Projectile.png')
    png_width, png_height = struct.unpack_from('>II', data, 16)
    assert png_width % png_height == 0
    (ROOT / 'public/tiny-swords/haunt-wisp.png').write_bytes(data)
    manifest['haunt-wisp'] = dict(src='/tiny-swords/haunt-wisp.png', width=png_width, height=png_height,
                                 frameWidth=png_height, frames=png_width // png_height, anchor=.5)
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    (ROOT / 'app/game/bestiary.json').write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + '\n')
    print(f'Imported {len(catalog)} species with original idle, movement and attack strips.')

if __name__ == '__main__':
    main()
