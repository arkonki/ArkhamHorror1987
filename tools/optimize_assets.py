"""Make the web-sized images the app actually downloads.

- public/assets/board_view.webp: only the street map the UI shows (Board.tsx CROP), as WebP.
  board.jpg stays as the full-size reference that tools/genboard.py coordinates refer to.
- public/assets/monsters/{front,back}/*.webp from the PNG counters (alpha kept).

Run after tools/extract_assets.py:  python3 tools/optimize_assets.py
"""
import glob
import os

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')
# Keep in sync with CROP in src/ui/Board.tsx.
CROP = (590, 480, 590 + 2790, 480 + 1985)


def report(src_bytes, path):
    print(f'{os.path.relpath(path, ROOT)}: {src_bytes // 1024} KB -> {os.path.getsize(path) // 1024} KB')


board = os.path.join(ROOT, 'board.jpg')
out = os.path.join(ROOT, 'board_view.webp')
Image.open(board).crop(CROP).save(out, 'WEBP', quality=78, method=6)
report(os.path.getsize(board), out)

total_in = total_out = 0
for png in sorted(glob.glob(os.path.join(ROOT, 'monsters', '*', '*.png'))):
    webp = png[:-4] + '.webp'
    Image.open(png).save(webp, 'WEBP', quality=85, method=6)
    total_in += os.path.getsize(png)
    total_out += os.path.getsize(webp)
    os.remove(png)
if total_in:
    print(f'monsters: {total_in // 1024} KB -> {total_out // 1024} KB')
