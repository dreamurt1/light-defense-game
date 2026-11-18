"""Tori walk eye-color fix (Light Defense, Claude Code 2026-11-18).

WHY: image generation redraws the whole picture, so every retry changes the
lashes, and "edit" requests often leave the eye color unchanged. This script
changes ONLY the eye pixels, deterministically: it copies the iris palette of
f01 (= the idle image) onto f02-f04 by brightness rank. Shapes, lashes,
highlights, fur, ribbon and outline stay exactly as drawn.

USE (Python 3 + Pillow + numpy):
    python tori_eye_fix.py <pack_folder> [--idle <idle png> ...]

<pack_folder> holds direction folders such as 045_front_right/ with
tori_walk_<view>_f01.png ... f04.png. The result goes to <pack_folder>_eyefix/
(same structure; f01 copied unchanged; strips/ rebuilt if present).
--idle: idle PNGs (tori_idle_<view>.png). f01 of that view must equal it pixel
for pixel, otherwise the report says so.

Do not edit the output by hand or with image generation afterwards.
"""
import os
import re
import shutil
import sys

import numpy as np
from PIL import Image

EYE_Y_LIMIT = 384          # eyes are in the upper 75% of the 512 canvas
MIN_EYE_PIXELS = 150       # fewer = no eye visible (back views) -> leave as is
COLOR_TOLERANCE = 25       # RGB distance of mean eye color vs f01
FRAME_RE = re.compile(r"^tori_walk_(.+)_f0([1-4])\.png$")


def load(path):
    return np.array(Image.open(path).convert("RGBA"))


def eye_mask(a):
    r, g, b, al = (a[..., i].astype(int) for i in range(4))
    m = (al >= 200) & (b > r + 25) & (b > g + 25)
    m[EYE_Y_LIMIT:, :] = False
    return m


def lum(rgb):
    return 0.299 * rgb[:, 0] + 0.587 * rgb[:, 1] + 0.114 * rgb[:, 2]


def js_round(x):
    return np.floor(np.asarray(x) + 0.5)


def pupil_blobs(a, m):
    """Count big very-dark iris blobs (2 eyes = 2; more = doubled eye)."""
    r, b = a[..., 0].astype(int), a[..., 2].astype(int)
    p = m & (b < 140) & (r < 90)
    h, w = p.shape
    seen = np.zeros_like(p)
    min_blob = max(40, (w * h) / 6000)
    blobs = 0
    for y0, x0 in zip(*np.nonzero(p)):
        if seen[y0, x0]:
            continue
        stack, n = [(y0, x0)], 0
        seen[y0, x0] = True
        while stack:
            y, x = stack.pop()
            n += 1
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < h and 0 <= xx < w and p[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True
                    stack.append((yy, xx))
        if n >= min_blob:
            blobs += 1
    return blobs


def recolor(ref, src):
    """Return (fixed image, number of eye pixels) — f01 palette by brightness rank."""
    rm, sm = eye_mask(ref), eye_mask(src)
    n = int(sm.sum())
    if rm.sum() < MIN_EYE_PIXELS or n < MIN_EYE_PIXELS:
        return src.copy(), n
    rc = ref[rm][:, :3].astype(float)
    rc = rc[np.argsort(lum(rc), kind="stable")]
    sc = src[sm][:, :3].astype(float)
    order = np.argsort(lum(sc), kind="stable")
    big_n = len(rc)
    win = max(2, int(js_round(big_n * 0.02)))
    csum = np.vstack([np.zeros(3), np.cumsum(rc, axis=0)])
    t = np.arange(n) / (n - 1) if n > 1 else np.zeros(n)
    c = js_round(t * (big_n - 1)).astype(int)
    lo, hi = np.maximum(0, c - win), np.minimum(big_n - 1, c + win)
    mean = (csum[hi + 1] - csum[lo]) / (hi - lo + 1)[:, None]
    new = np.empty_like(sc)
    new[order] = js_round(mean)
    out = src.copy()
    out[sm, :3] = new.astype(np.uint8)
    return out, n


def mean_eye(a):
    m = eye_mask(a)
    return a[m][:, :3].astype(float).mean(axis=0) if m.sum() >= MIN_EYE_PIXELS else None


def hexc(c):
    return "#" + "".join(f"{int(round(v)):02X}" for v in c)


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    pack = argv[0].rstrip("/\\")
    idle = {}
    if "--idle" in argv:
        for p in argv[argv.index("--idle") + 1:]:
            m = re.match(r"^tori_idle_(.+)\.png$", os.path.basename(p))
            if m:
                idle[m.group(1)] = load(p)
    out_root = pack + "_eyefix"
    if os.path.exists(out_root):
        shutil.rmtree(out_root)
    problems, rows = [], []
    for d in sorted(os.listdir(pack)):
        src_dir = os.path.join(pack, d)
        if not os.path.isdir(src_dir) or d == "strips":
            continue
        frames = {}
        for f in os.listdir(src_dir):
            m = FRAME_RE.match(f)
            if m:
                frames[int(m.group(2))] = (m.group(1), os.path.join(src_dir, f))
        if sorted(frames) != [1, 2, 3, 4]:
            continue
        view = frames[1][0]
        dst_dir = os.path.join(out_root, d)
        os.makedirs(dst_dir, exist_ok=True)
        ref = load(frames[1][1])
        shutil.copyfile(frames[1][1], os.path.join(dst_dir, os.path.basename(frames[1][1])))
        if view in idle:
            same = idle[view].shape == ref.shape and np.array_equal(idle[view], ref)
            rows.append(f"{view} f01 = idle image you were given: {'YES' if same else 'NO'}")
            if not same:
                problems.append(f"{view}: f01 is NOT the attached idle image — start again from the attached idle PNG")
        ref_mean = mean_eye(ref)
        ref_blobs = pupil_blobs(ref, eye_mask(ref))
        strip = [ref]
        for k in (2, 3, 4):
            src = load(frames[k][1])
            fixed, n = recolor(ref, src)
            outside = int(np.any(fixed != src, axis=2)[~eye_mask(src)].sum())
            Image.fromarray(fixed, "RGBA").save(os.path.join(dst_dir, os.path.basename(frames[k][1])))
            strip.append(fixed)
            before, after = mean_eye(src), mean_eye(fixed)
            blobs = pupil_blobs(fixed, eye_mask(fixed))
            if ref_mean is None or after is None:
                rows.append(f"{view} f0{k}: no eye visible — unchanged")
                continue
            dist = float(np.sqrt(((after - ref_mean) ** 2).sum()))
            ok = dist <= COLOR_TOLERANCE and outside == 0 and blobs <= ref_blobs
            rows.append(
                f"{view} f0{k}: eye {hexc(before)} -> {hexc(after)} (f01 {hexc(ref_mean)}), "
                f"distance {dist:.1f}, pixels changed outside eyes {outside}, "
                f"pupil blobs {blobs} (f01 {ref_blobs}) {'OK' if ok else 'CHECK'}"
            )
            if dist > COLOR_TOLERANCE:
                problems.append(f"{view} f0{k}: eye color still differs")
            if blobs > ref_blobs:
                problems.append(f"{view} f0{k}: more pupil blobs than f01 — eyes look doubled, redraw this frame")
        if os.path.isdir(os.path.join(pack, "strips")):
            os.makedirs(os.path.join(out_root, "strips"), exist_ok=True)
            Image.fromarray(np.concatenate(strip, axis=1), "RGBA").save(
                os.path.join(out_root, "strips", f"tori_walk_strip_{view}.png"))
    for f in os.listdir(pack):
        if os.path.isfile(os.path.join(pack, f)):
            shutil.copyfile(os.path.join(pack, f), os.path.join(out_root, f))
    print("\n".join(rows))
    print("RESULT:", "ALL OK" if not problems else "PROBLEMS")
    for p in problems:
        print(" -", p)
    print("output:", out_root)
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
