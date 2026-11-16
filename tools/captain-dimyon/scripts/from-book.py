"""Build the site's images from the book PDF's embedded illustrations.

1) Extract the images:   pdfimages -j book.pdf <raw>/img
2) Run:                  python3 scripts/from-book.py <raw> public

Each book page holds a clean 2400x1200 illustration (no text); page 1 is the full cover.
"""
import sys, os
from PIL import Image, ImageDraw, ImageFilter

raw, pub = sys.argv[1], sys.argv[2]
A = os.path.join(pub, 'assets')
ILL = os.path.join(A, 'illustrations'); os.makedirs(ILL, exist_ok=True)
CH = os.path.join(A, 'characters'); os.makedirs(CH, exist_ok=True)

# image number from `pdfimages -list` -> illustration name (PDF page = spread + 1)
PAGES = {
    3: '01-bedtime', 42: '02-grrr-under-bed', 99: '03-captain-arrives', 159: '04-dont-be-afraid',
    210: '05-tunnel', 249: '06-world-under-bed', 284: '07-footprints', 321: '08-monster-appears',
    393: '09-lost-monster', 438: '10-home-dream', 489: '11-taking-her-home', 534: '12-hug-goodbye',
    582: '13-back-to-bed', 615: '14-sweet-dreams',
}

def img(n):
    return Image.open(os.path.join(raw, f'img-{n:03d}.jpg')).convert('RGB')

def save_set(im, base, w2=2400):
    im.save(f'{base}-2400.jpg', quality=82, optimize=True, progressive=True)
    im.save(f'{base}-2400.webp', quality=78, method=6)
    im.resize((1200, round(1200 * im.height / im.width)), Image.LANCZOS).save(f'{base}-1200.webp', quality=78, method=6)

for n, name in PAGES.items():
    save_set(img(n), os.path.join(ILL, name))

# cover wrap 3750x1800: front 0..1800, spine, back 1950..3750
wrap = img(0)
wrap.save(os.path.join(A, 'book-cover-wrap.jpg'), quality=82, optimize=True, progressive=True)
front = wrap.crop((0, 0, 1800, 1800))
front.save(os.path.join(A, 'book-cover-front.jpg'), quality=84, optimize=True, progressive=True)
front.resize((1600, 1600), Image.LANCZOS).save(os.path.join(A, 'book-cover-front-1600.webp'), quality=80, method=6)
front.resize((800, 800), Image.LANCZOS).save(os.path.join(A, 'book-cover-front-800.webp'), quality=80, method=6)
front.crop((0, 30, 1800, 975)).resize((1200, 630), Image.LANCZOS).save(os.path.join(pub, 'og-image.jpg'), quality=84, optimize=True)

# round character portraits (until transparent PNGs arrive)
def portrait(src, box, name, size=640):
    im = src.crop(box).resize((size, size), Image.LANCZOS)
    mask = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    out = Image.new('RGBA', (size, size)); out.paste(im, (0, 0), mask)
    out.save(os.path.join(CH, f'{name}.webp'), quality=82, method=6)
    out.save(os.path.join(CH, f'{name}.png'), optimize=True)
    out.resize((320, 320), Image.LANCZOS).save(os.path.join(CH, f'{name}-320.webp'), quality=82, method=6)

portrait(img(99), (450, 330, 1150, 1030), 'alma')        # Alma with her bunny, page 4
portrait(img(99), (1150, 70, 1710, 630), 'captain')      # the captain flying in, page 4
portrait(img(438), (700, 790, 1080, 1170), 'bunny')      # the bunny, page 11
portrait(wrap, (2085, 1110, 2685, 1710), 'monster')      # the monster waving "shalom", back cover

# favicon: the captain's face
face = img(99).crop((1240, 170, 1580, 510))
for s, fn in ((180, 'apple-touch-icon.png'), (48, 'favicon-48.png'), (32, 'favicon-32.png')):
    face.resize((s, s), Image.LANCZOS).save(os.path.join(pub, fn), optimize=True)
print('done')
