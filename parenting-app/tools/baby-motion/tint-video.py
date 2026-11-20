"""Recolours skin, hair, eyes and clothes on every frame of a clip and writes a grid of looks."""
import sys, colorsys, numpy as np, cv2
from scipy import ndimage
src, out = sys.argv[1], sys.argv[2]

def masks(rgb):
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV); H, S, V = hsv[..., 0] / 360, hsv[..., 1], hsv[..., 2]
    h, w = H.shape; rows = np.arange(h)[:, None]
    mx = rgb.max(2); mn = rgb.min(2)
    figure = ndimage.binary_fill_holes(~(((mx - mn) < 0.095) & (mx > 0.55)))
    lab, n = ndimage.label(figure); figure = lab == (1 + np.argmax(ndimage.sum(figure, lab, range(1, n + 1))))
    cloth = figure & (H > 0.38) & (H < 0.62) & (S > 0.1)
    warm = figure & ~cloth & (S > 0.14) & ((H < 0.14) | (H > 0.96))
    ys, xs = np.where(figure); top, bottom = ys.min(), ys.max(); height = bottom - top
    sure = warm & (H > 0.06) & (H < 0.125) & (S > 0.42) & (V < 0.84) & (rows < top + 0.3 * height)
    sy, sx = np.where(sure)
    head_cx = np.median(sx) if len(sx) else xs.mean(); head_top = sy.min() if len(sy) else top
    facebox = np.zeros_like(figure)
    facebox[int(head_top + 0.12 * height):int(head_top + 0.36 * height), int(head_cx - 0.13 * height):int(head_cx + 0.13 * height)] = True
    # eyes: the two dark round blobs in the face; the iris is the coloured disc around each pupil
    darkb = figure & facebox & (V < 0.5)
    lab, n = ndimage.label(ndimage.binary_closing(darkb, iterations=2))
    iris = np.zeros_like(figure); eyeblob = np.zeros_like(figure)
    if n:
        sizes = ndimage.sum(darkb, lab, range(1, n + 1)); order = np.argsort(sizes)[::-1][:2] + 1
        eyeblob = ndimage.binary_dilation(np.isin(lab, order), iterations=3)
        yy, xx = np.mgrid[0:h, 0:w]
        for t in order:
            blob = lab == t; by, bx = np.where(blob)
            if len(by) < 40: continue
            pupil = blob & (V < 0.12); py, px = np.where(pupil) if pupil.any() else (by, bx)
            r = 0.4 * min(bx.max() - bx.min(), by.max() - by.min())
            disc = (yy - py.mean()) ** 2 + (xx - px.mean()) ** 2 < r * r
            iris |= disc & (V > 0.1) & (V < 0.8) & (S > 0.22) & (H > 0.02) & (H < 0.15)
    eyezone = ndimage.binary_dilation(eyeblob, iterations=14)
    # hair: grown from sure hair, never across the face; plus its light strands and highlights
    maybe = warm & ~eyezone & (H > 0.062) & (H < 0.13) & (S > 0.4) & (V < 0.9) & (rows < head_top + 0.36 * height)
    lab, n = ndimage.label(maybe); keep = np.unique(lab[sure & (lab > 0)])
    hair = np.isin(lab, [t for t in keep if (lab == t).sum() > 400])
    face = ndimage.binary_opening(warm & (V > 0.86) & (S < 0.42), iterations=4)
    hair = ndimage.binary_fill_holes(ndimage.binary_closing(hair, iterations=4)) & figure & ~eyezone
    hair |= ndimage.binary_dilation(hair, iterations=6) & figure & ~cloth & ~face & ~eyezone & (rows < head_top + 0.36 * height)
    hair &= ~(warm & (V > 0.9) & (S < 0.4) & (H < 0.075))             # clear skin showing between strands stays skin
    brow_c = warm & facebox & ~hair & ~eyezone & (H > 0.055) & (H < 0.12) & (S > 0.4) & (V > 0.45) & (V < 0.82)
    lab, n = ndimage.label(brow_c); brows = np.zeros_like(figure)
    if n:
        sizes = ndimage.sum(brow_c, lab, range(1, n + 1)); cms = ndimage.center_of_mass(brow_c, lab, range(1, n + 1))
        brows = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if 25 < s < 900 and cms[i][0] < head_top + 0.24 * height])
    lips = warm & ((H < 0.03) | (H > 0.96)) & (S > 0.42) & facebox
    skin = warm & ~hair & ~brows & ~iris & ~(eyeblob & (V < 0.45))
    f = lambda m: ndimage.gaussian_filter(m.astype(np.float32), 1.2)
    # thin, light wisps of hair over the forehead are half hair, half the skin showing through
    wisp = np.clip((V - 0.74) / 0.16, 0, 1) * hair * ndimage.binary_dilation(skin, iterations=10)
    return dict(cloth=f(cloth), hair=f(hair | brows) * (1 - 0.6 * f(wisp)), iris=f(iris), skin=np.clip(f(skin) + 0.85 * f(wisp), 0, 1), lips=f(lips)), (H, S, V)

lin = lambda c: np.power(np.clip(c, 0, 1), 2.2); srgb = lambda c: np.power(np.clip(c, 0, 1), 1 / 2.2)
hexrgb = lambda x: np.array([int(x[i:i + 2], 16) / 255 for i in (1, 3, 5)], dtype=np.float32)
BASE = dict(skin=hexrgb('#F7C4A8'), hair=hexrgb('#B8824F'))        # the clip's own skin and hair tone
CS, CV, ES, EV = 0.24, 0.80, 0.63, 0.39                            # the clip's own cloth and iris levels
def gain(img, mask, target, key, k=1.0):
    """A tone change that keeps the shading: scale in linear light, then keep a little of the
    original highlights so dark tones stay soft and light tones do not burn out."""
    g = np.clip(lin(hexrgb(target)) / lin(BASE[key]), 0.03, 1.45)
    new = srgb(lin(img) * g)
    lum = img.max(2, keepdims=True)
    new = new + np.clip(lum - 0.62, 0, 1) * 0.22 * (1 - new)          # soft sheen stays visible
    return img + (new - img) * (mask[..., None] * k)
def cloth_to(img, mask, target):
    """Repaints the fabric and keeps its folds: the fabric's own light and shade is carried over
    as a gentle multiply, so pastel colours stay soft instead of flat or neon."""
    t = hexrgb(target); hs = cv2.cvtColor(img.astype(np.float32), cv2.COLOR_RGB2HSV)
    shade = np.clip(hs[..., 2:3] / CV, 0.55, 1.18)                     # fold shading around 1.0
    new = np.clip(t[None, None] * (0.25 + 0.75 * shade), 0, 1)
    new = new + np.clip(shade - 1.0, 0, 1) * 0.5 * (1 - new)           # highlights lift towards white
    return img + (new - img) * mask[..., None]
def hair_to(img, mask, target):
    """Repaints the hair in one clean colour and keeps its strands: light and shade come from the clip."""
    t = hexrgb(target); v = img.max(2, keepdims=True)
    shade = np.clip(v / 0.66, 0.35, 1.5)
    new = np.clip(t[None, None] * (0.18 + 0.82 * shade), 0, 1)
    new = new + np.clip(shade - 1.05, 0, 1) * 0.45 * (1 - new)
    return img + (new - img) * mask[..., None]
def hue_to(img, mask, target, bs, bv):
    th, ts, tv = colorsys.rgb_to_hsv(*hexrgb(target)); hs = cv2.cvtColor(img.astype(np.float32), cv2.COLOR_RGB2HSV); o = hs.copy()
    o[..., 0] = th * 360; o[..., 1] = np.clip(hs[..., 1] * ts / bs, 0, 1); o[..., 2] = np.clip(hs[..., 2] * tv / bv, 0, 1)
    return img + (cv2.cvtColor(o, cv2.COLOR_HSV2RGB) - img) * mask[..., None]
SKIN = {'porcelain': '#FBDCCB', 'peach': None, 'honey': '#EEC3A2', 'tan': '#D9AA86', 'brown': '#B5825F', 'deep': '#8C5F45'}
HAIR = {'golden': None, 'blond': '#DCC190', 'chestnut': '#946645', 'brown': '#65493A', 'black': '#403632', 'auburn': '#B97A55'}
EYES = {'brown': None, 'hazel': '#7A5A2E', 'blue': '#6C9CC8', 'green': '#6F9B6A', 'grey': '#8C9AA8'}
CLOTH = {'mint': None, 'rose': '#F5BFCB', 'peach': '#F8CDB0', 'butter': '#F5E2A6', 'sky': '#B4D2EE', 'lilac': '#D2C4EE', 'sage': '#C3D9BC', 'cream': '#F4EFE6'}
LOOKS = [('peach', 'golden', 'brown', 'mint'), ('honey', 'brown', 'hazel', 'rose'), ('tan', 'black', 'brown', 'butter'),
         ('deep', 'black', 'brown', 'lilac'), ('porcelain', 'blond', 'blue', 'sky'), ('porcelain', 'auburn', 'green', 'cream')]
def look(rgb, M, sk, ha, ey, cl):
    img = rgb.copy()
    if SKIN[sk]: img = gain(img, M['skin'], SKIN[sk], 'skin'); img = gain(img, M['lips'], SKIN[sk], 'skin', 0.4)
    if HAIR[ha]: img = hair_to(img, M['hair'], HAIR[ha])
    if EYES[ey]: img = hue_to(img, M['iris'], EYES[ey], ES, EV)
    if CLOTH[cl]: img = cloth_to(img, M['cloth'], CLOTH[cl])
    return img

if out.endswith('.png'):                                              # palette sheet from the first frame
    from PIL import Image
    cap = cv2.VideoCapture(src); ok, f = cap.read(); rgb = cv2.cvtColor(f, cv2.COLOR_BGR2RGB).astype(np.float32) / 255; M, _ = masks(rgb)
    rows = [[(k, 'golden', 'brown', 'mint') for k in SKIN], [('peach', k, 'brown', 'mint') for k in HAIR],
            [('peach', 'golden', k, 'mint') for k in EYES], [('peach', 'golden', 'brown', k) for k in CLOTH]]
    crops = [(150, 40, 520, 330), (150, 40, 520, 330), (210, 150, 460, 300), (84, 40, 584, 690)]; hs = [250, 250, 190, 330]
    W = 2000; sheet = Image.new('RGB', (W, sum(hs) + 30), (241, 241, 239)); y = 0
    for row, c, hgt in zip(rows, crops, hs):
        tw = int(hgt * (c[2] - c[0]) / (c[3] - c[1]))
        for i, L in enumerate(row):
            t = Image.fromarray((np.clip(look(rgb, M, *L), 0, 1) * 255).astype(np.uint8)).crop(c).resize((tw, hgt), Image.LANCZOS); sheet.paste(t, (10 + i * (tw + 8), y))
        y += hgt + 10
    sheet.save(out); sys.exit(0)
cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS); TW, TH = 400, 520; X0, X1, Y0, Y1 = 84, 584, 40, 690
vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*'mp4v'), fps, (TW * 3, TH * 2)); n = 0
while True:
    ok, f = cap.read()
    if not ok: break
    rgb = cv2.cvtColor(f, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    M, _ = masks(rgb)
    grid = np.zeros((TH * 2, TW * 3, 3), np.uint8)
    for i, L in enumerate(LOOKS):
        t = (np.clip(look(rgb, M, *L), 0, 1) * 255).astype(np.uint8)[Y0:Y1, X0:X1]
        grid[(i // 3) * TH:(i // 3 + 1) * TH, (i % 3) * TW:(i % 3 + 1) * TW] = cv2.resize(t, (TW, TH), interpolation=cv2.INTER_AREA)
    vw.write(cv2.cvtColor(grid, cv2.COLOR_RGB2BGR)); n += 1
vw.release(); print('frames', n)
