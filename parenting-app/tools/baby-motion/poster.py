"""Prepares the welcome poster clip: crops the empty top, cross-fades the end into the start so it loops,
and prints the backdrop colour down the left edge (the page paints the same gradient beside the clip).

usage: poster.py SOURCE.mp4 OUT.mp4 OUT_POSTER.jpg [CROP_TOP]
"""
import subprocess, sys
import cv2, numpy as np

src, out, poster = sys.argv[1:4]
top = int(sys.argv[4]) if len(sys.argv) > 4 else 100
cap = cv2.VideoCapture(src); fr = []
while True:
    ok, f = cap.read()
    if not ok: break
    fr.append(f[top:])
N, F = len(fr), 14
H, W = fr[0].shape[:2]
frames = []
for i in range(F, N):
    a = fr[i].astype(np.float32)
    if i >= N - F:
        t = (i - (N - F) + 1) / (F + 1)
        a = a * (1 - t) + fr[i - (N - F)].astype(np.float32) * t
    frames.append(np.clip(a, 0, 255).astype(np.uint8))
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', '24', '-i', '-',
                      '-c:v', 'libx264', '-crf', '25', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out], stdin=subprocess.PIPE)
for f in frames: p.stdin.write(f.tobytes())
p.stdin.close(); p.wait()
cv2.imwrite(poster, frames[0], [cv2.IMWRITE_JPEG_QUALITY, 86])
med = np.median(np.stack(frames[::10]), 0)
for q in (0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1):
    y = min(H - 1, int(q * H))
    l = med[max(0, y - 3):y + 4, 2:10].reshape(-1, 3).mean(0); r = med[max(0, y - 3):y + 4, W - 10:W - 2].reshape(-1, 3).mean(0)
    print(q, '#%02X%02X%02X' % (int(l[2]), int(l[1]), int(l[0])), '#%02X%02X%02X' % (int(r[2]), int(r[1]), int(r[0])))
print(W, H, len(frames))
