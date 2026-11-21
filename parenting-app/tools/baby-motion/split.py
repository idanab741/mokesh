"""Cuts one generated clip of several characters on a plain backdrop into one looping 668x720 clip per character.

usage: split.py SOURCE.mp4 OUT_PREFIX CROP_W CROP_H name:cx:cy [name:cx:cy ...]
Each character is cropped around (cx, cy); the backdrop is flattened to the app canvas colour
(#F1F1EF) with a fitted backdrop field, plain bright pixels are pulled all the way to it, and the
last 12 frames are cross-faded into the first so the clip loops.
"""
import subprocess, sys
import cv2, numpy as np

src, prefix, cw, ch = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
cells = [(n, int(x), int(y)) for n, x, y in (a.split(':') for a in sys.argv[5:])]
cap = cv2.VideoCapture(src); fr = []
while True:
    ok, f = cap.read()
    if not ok: break
    fr.append(f)
N, F = len(fr), 12
H, W = fr[0].shape[:2]
TARGET = np.array([239, 241, 241], np.float32)  # BGR of #F1F1EF

stack = np.stack(fr[::8]).astype(np.int16)
plain = ((stack.max(3) - stack.min(3)) < 14).all(0) & (stack.min(3) > 195).all(0)
plain = cv2.erode(plain.astype(np.uint8), np.ones((11, 11), np.uint8)).astype(bool)
ys, xs = np.nonzero(plain)
def basis(u, v): return np.stack([np.ones_like(u), u, v, u * u, u * v, v * v, u ** 3, v ** 3, u * u * v, u * v * v], 1)
A = basis(xs / W - 0.5, ys / H - 0.5)
yy, xx = np.mgrid[0:H, 0:W]
B = basis((xx / W - 0.5).ravel(), (yy / H - 0.5).ravel())
med = np.median(stack, 0)
gain = np.zeros((H, W, 3), np.float32)
for c in range(3):
    coef, *_ = np.linalg.lstsq(A, med[ys, xs, c], rcond=None)
    gain[:, :, c] = TARGET[c] / (B @ coef).reshape(H, W)

def clean(a):
    """Plain, bright pixels are backdrop: pull them to the exact canvas colour, with a soft ramp."""
    mn, mx = a.min(2), a.max(2)
    w = np.clip((mn - 224) / 10, 0, 1) * np.clip((16 - (mx - mn)) / 8, 0, 1)
    w = cv2.GaussianBlur(w, (0, 0), 1.2)[..., None]
    return a * (1 - w) + TARGET * w

for name, cx, cy in cells:
    x0, y0 = cx - cw // 2, cy - ch // 2
    g = gain[y0:y0 + ch, x0:x0 + cw]
    out = []
    for i in range(F, N):
        a = fr[i][y0:y0 + ch, x0:x0 + cw].astype(np.float32)
        if i >= N - F:
            t = (i - (N - F) + 1) / (F + 1)
            a = a * (1 - t) + fr[i - (N - F)][y0:y0 + ch, x0:x0 + cw].astype(np.float32) * t
        a = np.clip(clean(np.clip(a * g, 0, 255)), 0, 255).astype(np.uint8)
        out.append(cv2.resize(a, (668, 720), interpolation=cv2.INTER_LANCZOS4))
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', '668x720', '-r', '24', '-i', '-',
                          '-c:v', 'libx264', '-crf', '22', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
                          f'{prefix}{name}-idle.mp4'], stdin=subprocess.PIPE)
    for f in out: p.stdin.write(f.tobytes())
    p.stdin.close(); p.wait()
    cv2.imwrite(f'{prefix}{name}-poster.jpg', out[0], [cv2.IMWRITE_JPEG_QUALITY, 90])
    print(name, [tuple(int(v) for v in out[0][y, x]) for y, x in ((8, 8), (360, 8), (712, 660), (100, 100))])
