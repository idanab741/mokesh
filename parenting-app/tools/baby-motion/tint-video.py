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
        yy, xx = np.mgrid[0:h, 0:w]
        eyeblob[:] = False
        for t in order:
            blob = lab == t; by, bx = np.where(blob)
            bw, bh = bx.max() - bx.min() + 1, by.max() - by.min() + 1
            # an open eye is a round dark blob in the upper face; a closed eye (a thin lash line) or the mouth is not
            if len(by) < 250 or bw > 1.7 * bh or by.mean() > head_top + 0.29 * height: continue
            eyeblob |= ndimage.binary_dilation(blob, iterations=3)
            pupil = blob & (V < 0.12); py, px = np.where(pupil) if pupil.any() else (by, bx)
            r = 0.4 * min(bw, bh)
            disc = (yy - py.mean()) ** 2 + (xx - px.mean()) ** 2 < r * r
            iris |= disc & (V > 0.1) & (V < 0.8) & (S > 0.22) & (H > 0.02) & (H < 0.15)
    # hair: grown from sure hair, never across the face; plus its light strands and highlights
    maybe = warm & (V > 0.2) & (H > 0.062) & (H < 0.13) & (S > 0.4) & (V < 0.9) & (rows < head_top + 0.36 * height)
    lab, n = ndimage.label(maybe); keep = np.unique(lab[sure & (lab > 0)])
    hair = np.isin(lab, [t for t in keep if (lab == t).sum() > 400])
    face = ndimage.binary_opening(warm & (V > 0.86) & (S < 0.42), iterations=4)
    hair = ndimage.binary_fill_holes(ndimage.binary_closing(hair, iterations=4)) & figure & ~face
    hair |= ndimage.binary_dilation(hair, iterations=6) & figure & ~cloth & ~face & (V > 0.2) & (rows < head_top + 0.36 * height)
    hair &= ~(warm & (V > 0.9) & (S < 0.4) & (H < 0.075))             # clear skin showing between strands stays skin
    brow_c = warm & facebox & ~hair & (H > 0.055) & (H < 0.12) & (S > 0.4) & (V > 0.45) & (V < 0.82)
    lab, n = ndimage.label(brow_c); brows = np.zeros_like(figure)
    if n:
        sizes = ndimage.sum(brow_c, lab, range(1, n + 1)); cms = ndimage.center_of_mass(brow_c, lab, range(1, n + 1))
        brows = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if 25 < s < 900 and cms[i][0] < head_top + 0.24 * height])
    lips = warm & ((H < 0.03) | (H > 0.96)) & (S > 0.42) & facebox
    skin = warm & ~hair & ~brows & ~iris & ~(eyeblob & (V < 0.45))
    f = lambda m: ndimage.gaussian_filter(m.astype(np.float32), 1.2)
    # Clothes: a soft measure of "how teal" every pixel is, so the blended pixels along the
    # outline, the seams and the buttons are repainted too and no layer of the old colour stays.
    win = np.clip((H - 0.30) / 0.07, 0, 1) * np.clip((0.70 - H) / 0.07, 0, 1)
    tealness = win * np.clip((S - 0.02) / 0.09, 0, 1)
    around = ndimage.binary_dilation(cloth, iterations=5)
    # the dark seam lines at the cuffs, ankles and neckline are fabric in shadow: greyish, not skin
    seam = around & figure & ~warm & (V < 0.78) & ~eyeblob
    cloth_soft = np.clip(np.maximum(np.maximum(f(cloth), tealness * around), f(seam)) * 1.25, 0, 1)
    # thin, light wisps of hair over the forehead are half hair, half the skin showing through
    wisp = np.clip((V - 0.74) / 0.16, 0, 1) * hair * ndimage.binary_dilation(skin, iterations=10)
    return dict(cloth=cloth_soft, hair=f(hair | brows) * (1 - 0.6 * f(wisp)), iris=f(iris), skin=np.clip(f(skin) + 0.85 * f(wisp), 0, 1), lips=f(lips)), (H, S, V)

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
    shade = np.clip(hs[..., 2:3] / CV, 0.5, 1.2)                       # fold shading around 1.0
    new = np.clip(t[None, None] * (0.25 + 0.75 * shade), 0, 1)
    new = new + np.clip(shade - 1.0, 0, 1) * 0.5 * (1 - new)           # highlights lift towards white
    return img + (new - img) * mask[..., None]
def hair_to(img, mask, target):
    """Repaints the hair and keeps its depth: the strands' light and shade come from the clip,
    shadows turn into a deeper, richer version of the colour and highlights into a lighter one."""
    t = hexrgb(target)[None, None]; v = img.max(2, keepdims=True)
    shade = np.clip(v / 0.66, 0.0, 1.6)
    deep = t * t * 0.62 + t * 0.10                                    # darker and more saturated
    light = t + (1 - t) * 0.42
    k = np.clip((shade - 0.42) / 0.58, 0, 1); k = k * k * (3 - 2 * k)
    new = np.where(shade < 1, deep + (t - deep) * k, t + (light - t) * np.clip((shade - 1) / 0.42, 0, 1))
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
if out.endswith('.pack.mp4'):
    # Masks found frame by frame flicker, because every frame is judged on its own. Each mask
    # is therefore steadied over time: the masks of the three frames before and after are
    # moved onto the current frame (following the motion) and the median of the seven is used.
    first, last = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (0, 10 ** 9)
    cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS); CW, CH, X0 = 668, 720, 306; R = 3
    frames, raw = [], []
    n = -1
    while True:
        ok, f = cap.read(); n += 1
        if not ok or n > last: break
        if n < first: continue
        rgb = cv2.cvtColor(f, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
        M, _ = masks(rgb); c = lambda a: np.ascontiguousarray(a[:, X0:X0 + CW])
        frames.append((c(rgb) * 255).astype(np.uint8))
        raw.append(np.stack([c(np.clip(M['skin'] + 0.4 * M['lips'], 0, 1)), c(M['hair']), c(M['cloth']), c(M['iris'])], -1).astype(np.float16))
    grays = [cv2.cvtColor(f, cv2.COLOR_RGB2GRAY) for f in frames]
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    ys, xs = np.mgrid[0:CH, 0:CW].astype(np.float32)
    vw = cv2.VideoWriter(out + '.raw.mp4', cv2.VideoWriter_fourcc(*'mp4v'), fps, (CW * 3, CH * 2))
    for i in range(len(frames)):
        stack = [raw[i].astype(np.float32)]
        for j in range(max(0, i - R), min(len(frames), i + R + 1)):
            if j == i: continue
            flow = dis.calc(grays[i], grays[j], None)                 # where each pixel of frame i is in frame j
            stack.append(cv2.remap(raw[j].astype(np.float32), xs + flow[..., 0], ys + flow[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE))
        m = np.median(np.stack(stack), axis=0)
        # an iris exists only where the eye is open in this very frame (never on a closed eyelid)
        hsv = cv2.cvtColor(frames[i].astype(np.float32) / 255, cv2.COLOR_RGB2HSV)
        m[..., 3] *= np.clip((0.86 - hsv[..., 2]) / 0.08, 0, 1)
        lab_i, n_i = ndimage.label(m[..., 3] > 0.3)                    # a stray speck is not an eye
        if n_i:
            small = [k + 1 for k, sz in enumerate(ndimage.sum(np.ones_like(lab_i), lab_i, range(1, n_i + 1))) if sz < 120]
            m[..., 3][ndimage.binary_dilation(np.isin(lab_i, small), iterations=3)] = 0
        g = lambda k: np.repeat((np.clip(m[..., k], 0, 1) * 255).astype(np.uint8)[..., None], 3, 2)
        grid = np.zeros((CH * 2, CW * 3, 3), np.uint8)
        grid[:CH, :CW] = frames[i]; grid[:CH, CW:2 * CW] = g(0); grid[:CH, 2 * CW:] = g(1); grid[CH:, :CW] = g(2); grid[CH:, CW:2 * CW] = g(3)
        vw.write(cv2.cvtColor(grid, cv2.COLOR_RGB2BGR))
    vw.release(); print('packed', len(frames), 'frames'); sys.exit(0)

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
