import sys, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
src, N = sys.argv[1], int(sys.argv[2])
g = Image.open(src); F = g.size[0]
def cut(im):
    rgb = im.convert('RGB'); near = np.asarray(rgb).min(axis=2) > 232
    m = Image.fromarray(np.where(near, 255, 0).astype(np.uint8), 'L').copy()
    for x in range(0, F, 6):
        for y in (0, F - 1):
            if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
    for y in range(0, F, 6):
        for x in (0, F - 1):
            if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
    a = Image.fromarray(np.where(np.asarray(m) == 128, 0, 255).astype(np.uint8), 'L').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    out = rgb.convert('RGBA'); out.putalpha(a); return np.asarray(out).astype(np.float32) / 255
frames = []
for i in range(g.n_frames): g.seek(i); frames.append(cut(g.convert('RGB')))
def premul(f): return np.dstack([f[..., :3] * f[..., 3:4], f[..., 3:4]])
def gray(f):
    p = premul(f); return cv2.cvtColor(((p[..., :3] + (1 - p[..., 3:4])) * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM); dis.setFinestScale(0)
ys, xs = np.mgrid[0:F, 0:F].astype(np.float32)
def warp(p, flow, t): return cv2.remap(p, xs + flow[..., 0] * t, ys + flow[..., 1] * t, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
res = []
for i in range(len(frames) - 1):
    a, b = frames[i], frames[i + 1]; res.append(a)
    ga, gb = gray(a), gray(b)
    fab = cv2.GaussianBlur(dis.calc(ga, gb, None), (0, 0), 3); fba = cv2.GaussianBlur(dis.calc(gb, ga, None), (0, 0), 3)
    pa, pb = premul(a), premul(b)
    for k in range(1, N + 1):
        t = k / (N + 1); t2 = t * t * (3 - 2 * t)
        m = warp(pa, -fab, t) * (1 - t2) + warp(pb, -fba, 1 - t) * t2
        al = np.clip(m[..., 3:4], 1e-4, 1)
        res.append(np.dstack([np.clip(m[..., :3] / al, 0, 1), np.clip((m[..., 3:4] - 0.2) / 0.6, 0, 1)]))
res.append(frames[-1])
n = len(res); cols = 10; rows = (n + cols - 1) // cols
big = Image.new('RGBA', (cols * F, rows * F), (0, 0, 0, 0))
for i, f in enumerate(res): big.paste(Image.fromarray((f * 255).round().astype(np.uint8), 'RGBA'), ((i % cols) * F, (i // cols) * F))
big.save('wave.webp', 'WEBP', quality=86, method=4); print('frames', n, cols, rows)
prev = Image.new('RGB', (8 * F, F), (214, 235, 251))
for i in range(8):
    im = Image.fromarray((res[i + (N + 1)] * 255).round().astype(np.uint8), 'RGBA'); prev.paste(im, (i * F, 0), im)
prev.save('preview.png')
