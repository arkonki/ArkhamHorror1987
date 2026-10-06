"""Extract game artwork from the scanned ENG/*.pdf files into public/assets.

Usage:  python3 -m venv .venv && .venv/bin/pip install pymupdf pillow
        .venv/bin/python tools/extract_assets.py
"""
import os
import fitz
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENG = os.path.join(ROOT, 'ENG')
OUT = os.path.join(ROOT, 'public', 'assets')


def page_image(pdf, index, dpi):
    pix = fitz.open(os.path.join(ENG, pdf))[index].get_pixmap(dpi=dpi)
    return Image.frombytes('RGB', (pix.width, pix.height), pix.samples)


def save(im, *parts, quality=85):
    path = os.path.join(OUT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if path.endswith('.png'):
        im.save(path, optimize=True)
    else:
        im.convert('RGB').save(path, quality=quality)


# --- Board -------------------------------------------------------------------
save(page_image('game board full A2.pdf', 0, 150), 'board.jpg', quality=88)

# --- Cards (4x4 grid per page once rotated) ------------------------------------
CARD_PAGES = {
    1: [['repay'] * 4, ['repay'] * 4,
        ['skill_fast_talk', 'skill_sneak', 'skill_fight', 'skill_knowledge'],
        ['skill_fast_talk', 'skill_sneak', 'skill_fight', 'skill_knowledge']],
    3: [['elder_sign'] * 4,
        ['taxi_whistle', 'taxi_whistle', 'dynamite', 'dynamite'],
        ['automatic_45', 'automatic_45', 'revolver_38', 'revolver_38'],
        ['shotgun', 'shotgun', 'submachine_gun', 'rifle']],
    5: [['derringer_18', 'sword_of_glory', 'enchanted_knife', 'knife'],
        ['cavalry_saber', 'auction', 'auction', 'auction'],
        ['silver_key', 'brazen_head', 'silver_bullet', 'holy_water'],
        ['lamp_of_alhazred', 'brass_collar', 'piccolo_of_leng', 'dragons_eye']],
    7: [['healing_stone', 'alien_spectacles', 'ruby_of_rlyeh', 'flute_of_the_outer_gods'],
        ['blue_watcher', 'tom_big_mountain', 'eric_colt', None],
        ['retainer'] * 4, [None] * 4],
    9: [['gate_rlyeh', 'gate_abyss', 'gate_plateau_of_leng', 'gate_yuggoth'],
        ['gate_earths_dreamlands', 'gate_great_hall_of_celeano', 'gate_city_of_the_great_race', 'gate_another_dimension'],
        [None] * 4, [None] * 4],
    11: [['bind_monster'] * 4,
         ['bind_monster', 'bind_monster', 'cloud_memory', 'cloud_memory'],
         ['flesh_ward', 'find_gate', 'find_gate', 'find_gate'],
         ['dread_curse_of_azathoth', 'dread_curse_of_azathoth', 'heal', 'heal']],
    13: [['power_drain', 'power_drain', 'powder_of_ibn_ghazi', 'powder_of_ibn_ghazi'],
         ['mists_of_rlyeh', 'mists_of_rlyeh', 'shrivelling', 'shrivelling'],
         [None] * 4, [None] * 4],
}
# card backs: (page, row, col, rotate180)
CARD_BACKS = {
    'back_skill': (2, 0, 0), 'back_charity': (2, 2, 0), 'back_item': (4, 0, 0),
    'back_retainer': (8, 1, 0), 'back_local_character': (8, 2, 1),
    'back_gate': (10, 0, 0), 'back_spell': (12, 0, 0),
}


def card_cells(page):
    im = page_image('06 cards.pdf', page - 1, 200).rotate(90, expand=True)
    w, h = im.size
    cells = {}
    for r in range(4):
        for c in range(4):
            x0, y0 = c * w / 4, 30 + r * (h - 60) / 4
            cells[(r, c)] = im.crop((int(x0 + 8), int(y0 + 8), int(x0 + w / 4 - 8), int(y0 + (h - 60) / 4 - 8)))
    return cells


for page, grid in CARD_PAGES.items():
    cells = card_cells(page)
    seen = set()
    for r, row in enumerate(grid):
        for c, name in enumerate(row):
            if name and name not in seen:
                seen.add(name)
                save(cells[(r, c)], 'cards', f'{name}.jpg')

back_pages = {}
for name, (page, r, c) in CARD_BACKS.items():
    if page not in back_pages:
        back_pages[page] = card_cells(page)
    save(back_pages[page][(r, c)].rotate(180), 'cards', f'{name}.jpg')
# The charity card front is the purple "Charity" face; "repay" is its flip side.
os.replace(os.path.join(OUT, 'cards', 'back_charity.jpg'), os.path.join(OUT, 'cards', 'charity.jpg'))

# --- Monster counters (7x7 grid; back page is mirrored left-right) ------------
def counter_cells(page):
    im = page_image('07 counters.pdf', page, 300)
    w, h = im.size
    cw, ch = w * 0.982 / 7, h * 0.0985
    x0, y0 = w * 0.01, h * 0.006
    return im, cw, ch, x0, y0


def diamond(cell):
    """Rotate a square counter 45 degrees so its arrow points up; transparent corners."""
    cell = cell.resize((256, 256)).convert('RGBA')
    return cell.rotate(45, expand=True, resample=Image.BICUBIC, fillcolor=(0, 0, 0, 0))


for page, side in ((0, 'front'), (1, 'back')):
    im, cw, ch, x0, y0 = counter_cells(page)
    for r in range(7):
        for c in range(7):
            col = c if side == 'front' else 6 - c
            cell = im.crop((int(x0 + c * cw + 4), int(y0 + r * ch + 4), int(x0 + (c + 1) * cw - 4), int(y0 + (r + 1) * ch - 4)))
            save(diamond(cell), 'monsters', side, f'm{r}{col}.png')

# doom factor counter (front page, row 7 col 6 area on back page)
im, cw, ch, x0, y0 = counter_cells(1)
save(im.crop((int(x0 + 6 * cw + 4), int(y0 + 7 * ch + 4), int(x0 + 7 * cw - 4), int(y0 + 8 * ch - 4))).resize((160, 160)), 'doom_factor.png')

# --- Investigator sheets --------------------------------------------------------
INVESTIGATORS = [['vincent_lee', 'gloria_goldberg'], ['joe_diamond', 'monterey_jack'],
                 ['jenny_barnes', 'mandy_thompson'], ['carolyn_fern', 'harvey_walters']]
im = page_image('05 investigators.pdf', 0, 200)
w, h = im.size
for r, row in enumerate(INVESTIGATORS):
    for c, name in enumerate(row):
        x0 = (0.03 if c == 0 else 0.5) * w
        x1 = (0.495 if c == 0 else 0.965) * w
        y0, y1 = (0.027 + r * 0.237) * h, (0.027 + (r + 1) * 0.237) * h
        save(im.crop((int(x0), int(y0), int(x1), int(y1))), 'investigators', f'{name}.jpg')
print('assets written to', OUT)
