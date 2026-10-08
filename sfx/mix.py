#!/usr/bin/env python3
"""
Bot Studio launch film - SFX mixer.

    python3 sfx/mix.py                 # music + every sfx/cues/s*.json  -> public/mix.wav
    python3 sfx/mix.py --only s03,s04  # just those scenes               -> sfx/build/mix_s03_s04.wav
    python3 sfx/mix.py --demo          # sfx/cues/_demo.json only         -> sfx/build/mix_demo.wav
    python3 sfx/mix.py --sheet my.json # any cue file(s), e.g. a draft  -> sfx/build/mix_sheet.wav
    python3 sfx/mix.py --check         # validate cue sheets, no render
    python3 sfx/mix.py --audit         # + per-cue audibility vs the music (buried / clear / hot)
    options: --out PATH  --stems  --no-duck  --no-cache  --music-db -3  --quiet

Cue sheet (sfx/cues/sNN.json):
    {"scene": "s03", "cues": [
        {"frame": 860, "sfx": "boom", "gain_db": -2, "pan": 0, "params": {"pre": 0.0}},
        {"frame": 900, "sfx": "whoosh", "gain_db": -9, "pan": 0.3, "params": {"direction": "lr"}, "offset_ms": -20}
    ]}
  frame     GLOBAL frame (60 fps). The sound's SYNC point (see CATALOG.md) lands on it.
  gain_db   level (sounds are normalised to -1 dBFS peak at 0 dB). Omit -> catalog default.
  pan       -1 (left) .. 1 (right), static placement on top of any internal motion.
  params    sound parameters (validated against sfx/lib.py signatures).
  offset_ms optional nudge.  send: optional reverb send 0..1.  duck_db: optional music duck depth.

Timing: frames within 0.6 frame of the 1/16-note grid are snapped to the exact musical time, and every cue
is shifted by MUSIC_LATENCY_MS (the music's transients sit 30 ms before the k*PER grid), so a hit on
B(k) is sample-locked with the kick.

Exit code 1 if any cue sheet had errors (the mix is still written with the valid cues).
"""
import argparse
import glob
import hashlib
import json
import os
import sys
import tempfile
import time

import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import lib  # noqa: E402

SR = lib.SR
FPS = lib.FPS
BEAT = lib.BEAT
MUSIC = os.path.join(ROOT, "public", "music.wav")
OUT = os.path.join(ROOT, "public", "mix.wav")
CUES = os.path.join(HERE, "cues")
BUILD = os.path.join(HERE, "build")
CACHE = os.path.join(BUILD, "cache")

MUSIC_DB = -3.0           # music bed level
MUSIC_LATENCY_MS = -30.0  # measured: music transients lead the k*PER beat grid by 30.1 ms (median of 101 beats)
CEIL_DBTP = -1.0          # true-peak ceiling
REVERB = dict(rt60=1.9, damp=5500.0, predelay_ms=24.0, seed=11, width=1.0, lowcut=220.0)
REVERB_RETURN_DB = -4.0
KNOWN_KEYS = {"frame", "sfx", "gain_db", "pan", "params", "offset_ms", "send", "duck_db",
              "note", "comment", "label", "id", "desc"}


# --------------------------------------------------------------------------
def log(*a):
    if not ARGS.quiet:
        print(*a, flush=True)


def read_wav(path):
    sr, x = wavfile.read(path)
    if sr != SR:
        raise SystemExit(f"{path}: expected {SR} Hz, got {sr}")
    if x.dtype == np.int16:
        x = x.astype(np.float64) / 32768.0
    elif x.dtype == np.int32:
        x = x.astype(np.float64) / 2147483648.0
    else:
        x = x.astype(np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    return x[:, :2]


def write_wav16(path, x, seed=0):
    rng = np.random.default_rng(seed)
    d = rng.random(x.shape) - rng.random(x.shape)  # TPDF dither, +-1 LSB
    q = np.clip(np.round(x * 32767.0 + d), -32768, 32767).astype(np.int16)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".mix-", suffix=".wav", dir=os.path.dirname(os.path.abspath(path)))
    os.close(fd)
    wavfile.write(tmp, SR, q)
    os.replace(tmp, path)  # atomic: readers never see a half-written file
    return int(np.sum(np.abs(q.astype(np.int32)) >= 32767))


# ------------------------------ loudness ----------------------------------
def kweight(x):
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    return signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=0), axis=0)


def lufs(x):
    """BS.1770-4 integrated loudness (gated)."""
    z = kweight(x)
    p = np.sum(z * z, axis=1) if z.ndim == 2 else z * z
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    if len(p) < blk:
        return -np.inf
    c = np.concatenate([[0.0], np.cumsum(p)])
    st = np.arange(0, len(p) - blk + 1, hop)
    ms = (c[st + blk] - c[st]) / blk
    lk = -0.691 + 10 * np.log10(ms + 1e-20)
    g = lk > -70
    if not g.any():
        return -np.inf
    rel = -0.691 + 10 * np.log10(ms[g].mean()) - 10
    g &= lk > rel
    return -0.691 + 10 * np.log10(ms[g].mean())


def true_peak_env(x, chunk=1 << 18):
    """Per-sample 4x-oversampled peak (max over channels)."""
    n = len(x)
    out = np.empty(n)
    pad = 64
    for s in range(0, n, chunk):
        a, b = max(0, s - pad), min(n, s + chunk + pad)
        up = signal.resample_poly(x[a:b].astype(np.float32), 4, 1, axis=0)
        e = np.maximum(np.abs(up[:, 0]), np.abs(up[:, 1])).reshape(-1, 4).max(1)
        xs = x[s:min(n, s + chunk)]
        out[s:min(n, s + chunk)] = np.maximum(e[s - a: s - a + len(xs)], np.maximum(np.abs(xs[:, 0]), np.abs(xs[:, 1])))
    return out


def dbfs(v):
    return 20 * np.log10(max(float(v), 1e-12))


# ------------------------------ dynamics ----------------------------------
def compress(x, thr_db=-9.0, ratio=2.0, knee=6.0, att=0.004, rel=0.15, hop=48):
    """Gentle feed-forward bus compressor (control rate 1 ms). Returns (y, max_gr_db)."""
    n = len(x)
    m = n // hop + 1
    pk = np.zeros(m)
    a = np.abs(x).max(1)
    pk[: n // hop] = a[: n // hop * hop].reshape(-1, hop).max(1)
    if n % hop:
        pk[n // hop] = a[n // hop * hop:].max()
    lv = 20 * np.log10(pk + 1e-9)
    over = lv - thr_db
    gr = np.where(over <= -knee / 2, 0.0,
                  np.where(over >= knee / 2, over * (1 - 1 / ratio), (1 - 1 / ratio) * (over + knee / 2) ** 2 / (2 * knee)))
    ca = np.exp(-hop / (att * SR))
    cr = np.exp(-hop / (rel * SR))
    sm = np.empty(m)
    g = 0.0
    for i in range(m):
        t = gr[i]
        g = ca * g + (1 - ca) * t if t > g else cr * g + (1 - cr) * t
        sm[i] = g
    if sm.max() <= 1e-6:
        return x, 0.0
    gs = np.interp(np.arange(n), np.arange(m) * hop + hop / 2, sm)
    return x * (10 ** (-gs / 20))[:, None], float(sm.max())


def limiter(x, ceil_db=CEIL_DBTP, look_ms=1.5, rel_ms=90.0, blk=32):
    """True-peak-safe look-ahead limiter. Returns (y, gain_curve, tp_in_dB, tp_out_dB)."""
    ceil = 10 ** (ceil_db / 20) * 0.98
    tp = true_peak_env(x)
    g = np.minimum(1.0, ceil / np.maximum(tp, 1e-9))
    if g.min() >= 1.0:
        return x, np.ones(len(x)), dbfs(tp.max()), dbfs(tp.max())
    L = max(1, int(look_ms * SR / 1000))
    gm = minimum_filter1d(g, 2 * L + 1, mode="nearest")
    cs = np.concatenate([[0.0], np.cumsum(np.concatenate([np.ones(L), gm]))])
    gs = (cs[L + 1:] - cs[: len(gm)]) / (L + 1)  # backward box over gm[i-L..i] (ones before the start)
    gs = np.minimum(gs, gm)
    n = len(x)
    nb = n // blk + 1
    gp = np.concatenate([gs, np.full(nb * blk - n, 1.0)]).reshape(nb, blk).min(1)
    gp = np.minimum(gp, np.minimum(np.concatenate([[1.0], gp[:-1]]), np.concatenate([gp[1:], [1.0]])))
    a = 1 - np.exp(-blk / (rel_ms / 1000 * SR))
    r = np.empty(nb)
    v = 1.0
    for i in range(nb):
        v = min(gp[i], v + (1.0 - v) * a)
        r[i] = v
    gi = np.interp(np.arange(n), np.arange(nb) * blk, r)
    gf = np.minimum(gi, gs)
    y = x * gf[:, None]
    tp2 = true_peak_env(y).max()
    lim = 10 ** (ceil_db / 20)
    if tp2 > lim:  # safety net (oversampling estimate mismatch)
        y *= lim / tp2 * 0.999
        gf *= lim / tp2 * 0.999
        tp2 *= lim / tp2 * 0.999
    return y, gf, dbfs(tp.max()), dbfs(tp2)


# ------------------------------ cues --------------------------------------
def cue_time(frame, offset_ms):
    """Seconds. Snap to the 1/16 grid if within 0.6 frame, then apply music latency + offset."""
    bf = BEAT * FPS
    q = round(frame / bf * 4) / 4
    t = q * BEAT if abs(q * bf - frame) <= 0.6 else frame / FPS
    return t + (MUSIC_LATENCY_MS + float(offset_ms)) / 1000.0


def load_sheets(errors, warnings):
    if ARGS.sheet:
        files = [os.path.abspath(f) for f in ARGS.sheet.split(",") if f]
    elif ARGS.demo:
        files = [os.path.join(CUES, "_demo.json")]
    else:
        files = sorted(glob.glob(os.path.join(CUES, "s*.json")))
        if ARGS.only:
            want = {s.strip() for s in ARGS.only.split(",") if s.strip()}
            files = [f for f in files if os.path.splitext(os.path.basename(f))[0] in want]
            if not files:
                warnings.append(f"--only {ARGS.only}: no matching cue sheets in sfx/cues/")
    sheets = []
    for f in files:
        base = os.path.splitext(os.path.basename(f))[0]
        try:
            with open(f) as fh:
                data = json.load(fh)
        except Exception as e:  # noqa: BLE001
            errors.append(f"{base}: cannot parse JSON ({e})")
            continue
        if isinstance(data, list):
            data = {"scene": base, "cues": data}
        scene = str(data.get("scene") or base)
        cues = []
        for i, c in enumerate(data.get("cues", [])):
            where = f"{base}[{i}]"
            if not isinstance(c, dict):
                errors.append(f"{where}: cue must be an object")
                continue
            name = c.get("sfx")
            if name not in lib.REGISTRY:
                import difflib
                near = difflib.get_close_matches(str(name), list(lib.REGISTRY), 2)
                errors.append(f"{where}: unknown sfx {name!r}" + (f" (did you mean {' / '.join(near)}?)" if near else ""))
                continue
            try:
                frame = float(c["frame"])
            except Exception:  # noqa: BLE001
                errors.append(f"{where} ({name}): missing/invalid 'frame'")
                continue
            params = c.get("params") or {}
            if not isinstance(params, dict):
                errors.append(f"{where} ({name}): 'params' must be an object")
                continue
            allowed = lib.params_of(name)
            bad = [k for k in params if k not in allowed]
            if bad:
                import difflib
                hints = {b: difflib.get_close_matches(b, list(allowed), 1) for b in bad}
                hint = ", ".join(f"{b}->{h[0]}?" for b, h in hints.items() if h)
                errors.append(f"{where} ({name}): unknown param(s) {bad}{' (' + hint + ')' if hint else ''}; "
                              f"allowed {sorted(allowed)}")
                continue
            extra = [k for k in c if k not in KNOWN_KEYS]
            if extra:
                warnings.append(f"{where} ({name}): ignored key(s) {extra}")
            try:
                gain = float(c.get("gain_db", lib.META[name]["gain"]))
                pan = float(c.get("pan", 0.0))
                off = float(c.get("offset_ms", 0.0))
                send = float(c.get("send", lib.META[name]["send"]))
                duck = c.get("duck_db")
                duck = None if duck is None else float(duck)
            except Exception as e:  # noqa: BLE001
                errors.append(f"{where} ({name}): bad numeric field ({e})")
                continue
            if abs(pan) > 1:
                warnings.append(f"{where} ({name}): pan {pan} clipped to [-1, 1]")
                pan = float(np.clip(pan, -1, 1))
            if gain > 6:
                warnings.append(f"{where} ({name}): gain_db {gain} is very hot (sounds are already -1 dBFS peak)")
            if not (0 <= frame < 4591):
                warnings.append(f"{where} ({name}): frame {frame:g} outside the film (0..4590)")
            cues.append(dict(scene=scene, idx=i, frame=frame, sfx=name, gain_db=gain, pan=pan,
                             params=params, offset_ms=off, send=float(np.clip(send, 0, 1)), duck_db=duck))
        sheets.append((scene, base, cues))
    return sheets


_LIBHASH = None


def _libhash():
    global _LIBHASH
    if _LIBHASH is None:
        with open(os.path.join(HERE, "lib.py"), "rb") as fh:
            _LIBHASH = hashlib.sha1(fh.read()).hexdigest()
    return _LIBHASH


def prune_cache():
    """Drop cached one-shots rendered by an older lib.py."""
    keep = _libhash()[:8]
    for f in glob.glob(os.path.join(CACHE, "*.npy")):
        if not os.path.basename(f).startswith(keep):
            try:
                os.remove(f)
            except OSError:
                pass


def synth(name, params, mem, stats):
    key = name + json.dumps(params, sort_keys=True)
    if key in mem:
        stats["mem"] += 1
        return mem[key]
    h = hashlib.sha1((_libhash() + key).encode()).hexdigest()[:20]
    path = os.path.join(CACHE, f"{_libhash()[:8]}-{name}-{h}.npy")
    if not ARGS.no_cache and os.path.exists(path):
        try:
            arr = np.load(path)
            sync = int(arr[-1, 0])
            res = (arr[:-1].astype(np.float64), sync)
            mem[key] = res
            stats["disk"] += 1
            return res
        except Exception:  # noqa: BLE001
            pass
    y = lib.render(name, params)
    res = (np.asarray(y, dtype=np.float64), int(y.sync))
    mem[key] = res
    stats["synth"] += 1
    if not ARGS.no_cache:
        os.makedirs(CACHE, exist_ok=True)
        blob = np.concatenate([res[0], [[res[1], 0]]]).astype(np.float32)
        fd, tmp = tempfile.mkstemp(prefix=".c-", suffix=".npy", dir=CACHE)
        os.close(fd)
        np.save(tmp, blob)
        os.replace(tmp, path)
    return res


def apply_pan(y, p):
    if abs(p) < 1e-6:
        return y
    a = abs(p) * np.pi / 2
    if p > 0:
        out = np.stack([y[:, 0] * np.cos(a), y[:, 1] + y[:, 0] * np.sin(a)], 1)
    else:
        out = np.stack([y[:, 0] + y[:, 1] * np.sin(a), y[:, 1] * np.cos(a)], 1)
    e0, e1 = np.sum(y * y), np.sum(out * out)
    return out * np.sqrt(e0 / e1) if e1 > 0 else out


# ------------------------------ audit -------------------------------------
_EDGES = 40.0 * 2 ** (np.arange(0, 28) / 3.0)  # 1/3-octave edges 40 Hz .. ~20 kHz


def audit(seg_sfx, a, music):
    """Return (max band SMR dB, broadband LU vs music, abs loudness) around the cue's loudest 20-100 ms."""
    mono = seg_sfx.mean(1)
    w = min(int(0.05 * SR), len(mono))
    if w < 16:
        return None
    cs = np.concatenate([[0.0], np.cumsum(mono * mono)])
    e = cs[w:] - cs[:-w]
    c = a + int(np.argmax(e)) + w // 2
    win = int(np.clip(len(mono), 0.02 * SR, 0.1 * SR))  # short sounds are judged on short windows
    s0 = max(0, min(len(music) - win, c - win // 2))
    rel = s0 - a
    sx = np.zeros(win)
    lo, hi = max(0, rel), min(len(mono), rel + win)
    if hi <= lo:
        return None
    sx[lo - rel: hi - rel] = mono[lo:hi]
    mx = music[s0:s0 + win].mean(1)
    hw = np.hanning(win)
    S = np.abs(np.fft.rfft(sx * hw)) ** 2
    M = np.abs(np.fft.rfft(mx * hw)) ** 2
    f = np.fft.rfftfreq(win, 1 / SR)
    idx = np.digitize(f, _EDGES)
    sb = np.bincount(idx, S, len(_EDGES) + 1)[1:-1]
    mb = np.bincount(idx, M, len(_EDGES) + 1)[1:-1]
    sig = sb > sb.max() * 1e-2
    smr = float(np.max(10 * np.log10((sb[sig] + 1e-20) / (mb[sig] + 1e-12 * sb.max() + 1e-20))))
    ks = kweight(sx)
    km = kweight(mx)
    lu = float(10 * np.log10((np.sum(ks * ks) + 1e-20) / (np.sum(km * km) + 1e-20)))
    absl = float(-0.691 + 10 * np.log10(2 * np.mean(ks * ks) + 1e-20))  # mono->stereo approx, 100 ms window
    return smr, lu, absl


# ------------------------------ main --------------------------------------
def main():
    t0 = time.time()
    errors, warnings = [], []
    sheets = load_sheets(errors, warnings)
    ncues = sum(len(c) for _, _, c in sheets)
    if ARGS.check:
        mem, stats = {}, {"synth": 0, "disk": 0, "mem": 0}
        for scene, base, cues in sheets:
            print(f"  {base:8s} {len(cues):3d} cues")
            for c in cues:  # test-synthesize (cached) to catch bad values, e.g. note names
                try:
                    synth(c["sfx"], c["params"], mem, stats)
                except Exception as e:  # noqa: BLE001
                    errors.append(f"{base}[{c['idx']}] ({c['sfx']}): synthesis failed: {e}")
        if not sheets:
            print("  (no cue sheets found)")
        for w in warnings:
            print("  WARN ", w)
        for e in errors:
            print("  ERROR", e)
        print(f"{ncues} valid cues, {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1 if errors else 0

    music = read_wav(MUSIC)
    n = len(music)
    bed = music * 10 ** (ARGS.music_db / 20)
    sfx = np.zeros((n, 2))
    send = np.zeros((n, 2))
    duck = np.zeros(n // 48 + 2)  # music duck depth in dB at 1 ms control rate
    mem, stats = {}, {"synth": 0, "disk": 0, "mem": 0}
    if not ARGS.no_cache:
        prune_cache()
    placed = []
    t_syn = time.time()
    for scene, base, cues in sheets:
        for c in cues:
            try:
                y, sync = synth(c["sfx"], c["params"], mem, stats)
            except Exception as e:  # noqa: BLE001
                errors.append(f"{base}[{c['idx']}] ({c['sfx']}): synthesis failed: {e}")
                continue
            t = cue_time(c["frame"], c["offset_ms"])
            start = int(round(t * SR)) - sync
            g = 10 ** (c["gain_db"] / 20)
            yy = apply_pan(y, c["pan"]) * g
            s0, e0 = max(0, start), min(n, start + len(yy))
            if e0 <= s0:
                warnings.append(f"{base}[{c['idx']}] ({c['sfx']}): entirely outside the film, skipped")
                continue
            seg = yy[s0 - start: e0 - start]
            sfx[s0:e0] += seg
            if c["send"] > 0:
                send[s0:e0] += seg * c["send"]
            meta = lib.META[c["sfx"]]
            depth = c["duck_db"] if c["duck_db"] is not None else meta["duck"] * float(np.clip(1 + (c["gain_db"] - meta["gain"]) / 12, 0, 1.25))
            if depth > 0 and not ARGS.no_duck:
                hit = int(round(t * SR)) // 48
                relms = 700 if c["sfx"] == "boom" else 420
                k = np.arange(-8, 80 + 5 * relms)
                shape = np.where(k < 0, (k + 8) / 8.0, np.where(k < 80, 1.0, np.exp(-(k - 80) / relms)))
                i0, i1 = max(0, hit - 8), min(len(duck), hit - 8 + len(k))
                if i1 > i0:
                    duck[i0:i1] = np.maximum(duck[i0:i1], depth * shape[i0 - (hit - 8): i1 - (hit - 8)])
            placed.append((c, s0, seg))
    t_syn = time.time() - t_syn

    # SFX bus: reverb send + gentle compression
    if np.any(send):
        ir = lib._ir(**REVERB)
        a = send[:, 0] * 0.8 + send[:, 1] * 0.2
        b = send[:, 1] * 0.8 + send[:, 0] * 0.2
        wet = np.stack([signal.oaconvolve(a, ir[:, 0])[:n], signal.oaconvolve(b, ir[:, 1])[:n]], 1)
        sfx = sfx + wet * 10 ** (REVERB_RETURN_DB / 20)
    sfx_gr = 0.0
    if np.any(sfx):
        sfx, sfx_gr = compress(sfx)
    if np.any(duck):
        dg = 10 ** (-np.interp(np.arange(n), np.arange(len(duck)) * 48, duck) / 20)
        bed_d = bed * dg[:, None]
    else:
        bed_d = bed
    mix = bed_d + sfx
    out, gcurve, pre_tp, tp = limiter(mix, CEIL_DBTP)
    if ARGS.out:
        out_path = ARGS.out
    elif ARGS.sheet:
        out_path = os.path.join(BUILD, "mix_sheet.wav")
    elif ARGS.demo:
        out_path = os.path.join(BUILD, "mix_demo.wav")
    elif ARGS.only:
        out_path = os.path.join(BUILD, "mix_" + "_".join(s for s in ARGS.only.split(",") if s) + ".wav")
    else:
        out_path = OUT
    clipped = write_wav16(out_path, out)
    if ARGS.stems:
        os.makedirs(BUILD, exist_ok=True)
        write_wav16(os.path.join(BUILD, "stem_sfx.wav"), np.clip(sfx, -1, 1))
        write_wav16(os.path.join(BUILD, "stem_music.wav"), bed_d)

    # ------------------------------ report ------------------------------
    sp = dbfs(np.abs(out).max())
    gr_db = np.maximum(0.0, -20 * np.log10(np.maximum(gcurve, 1e-9)))
    log(f"\n== Bot Studio mix -> {os.path.relpath(out_path, ROOT)}  ({n / SR:.2f} s, 48 kHz 16-bit stereo)")
    for scene, base, cues in sheets:
        cats = {}
        for c in cues:
            cats[lib.META[c['sfx']]['category']] = cats.get(lib.META[c['sfx']]['category'], 0) + 1
        log(f"  {base:8s} {len(cues):3d} cues  " + " ".join(f"{k}:{v}" for k, v in sorted(cats.items())))
    if not sheets:
        log("  (no cue sheets) -> music bed only")
    log(f"  sounds: {stats['synth']} synthesized, {stats['disk']} from disk cache, {stats['mem']} reused  ({t_syn:.1f} s)")
    log(f"  music bed {ARGS.music_db:+.1f} dB: {lufs(bed):.1f} LUFS | mix: {lufs(out):.1f} LUFS integrated"
        + (f" | sfx bus alone: {lufs(sfx):.1f} LUFS, bus comp max GR {sfx_gr:.1f} dB" if np.any(sfx) else ""))
    log(f"  peaks: pre-limiter {pre_tp:+.1f} dBTP -> out {tp:+.2f} dBTP / {sp:+.2f} dBFS sample | "
        f"limiter max GR {abs(float(gr_db.max())):.1f} dB | int16 clips: {clipped}")
    if np.any(duck):
        log(f"  music duck: max {duck.max():.1f} dB under impacts")
    hot = gr_db > 1.5
    if hot.any():
        fr = np.unique((np.nonzero(hot)[0] / SR * FPS).astype(int))
        groups = np.split(fr, np.nonzero(np.diff(fr) > 6)[0] + 1)
        desc = ", ".join(f"{g[0]}-{g[-1]} ({gr_db[int(g[0] / FPS * SR):int((g[-1] + 1) / FPS * SR)].max():.1f} dB)" for g in groups[:8])
        log(f"  limiter working >1.5 dB at frames: {desc}{' ...' if len(groups) > 8 else ''}  -> consider lowering cues there")
    # audit
    if placed:
        res = []
        for c, s0, seg in placed:
            r = audit(seg, s0, bed_d)
            if r:
                res.append((c, r))
        def is_hot(r):  # much louder than the music AND loud in absolute terms
            return r[1] > 4 and r[2] > -24
        buried = [(c, r) for c, r in res if r[0] < -8]
        hotc = [(c, r) for c, r in res if is_hot(r)]
        if ARGS.audit:
            log("\n  per-cue audit (SMR = best 1/3-oct band sfx vs music; LU = broadband K-weighted vs music;"
                " abs = sfx short-term loudness):")
            for c, r in res:
                smr, lu, absl = r
                tag = "BURIED" if smr < -8 else ("HOT" if is_hot(r) else ("subtle" if smr < 0 else "clear"))
                log(f"    {c['scene']:5s} f{int(c['frame']):5d} {c['sfx']:14s} {c['gain_db']:+5.1f} dB  "
                    f"SMR {smr:+6.1f}  LU {lu:+6.1f}  abs {absl:6.1f}  {tag}")
        log(f"  audit: {len(res) - len(buried) - len(hotc)} clear/subtle, {len(buried)} likely buried, {len(hotc)} hot"
            + ("" if ARGS.audit or not (buried or hotc) else "  (run with --audit for the list)"))
    for w in warnings:
        log("  WARN ", w)
    for e in errors:
        print("  ERROR", e, flush=True)
    log(f"  done in {time.time() - t0:.1f} s  ({ncues} cues, {len(errors)} error(s))")
    return 1 if errors else 0


def parse(argv=None):
    ap = argparse.ArgumentParser(description="Mix music + SFX cue sheets into public/mix.wav")
    ap.add_argument("--demo", action="store_true", help="render sfx/cues/_demo.json only (-> sfx/build/mix_demo.wav)")
    ap.add_argument("--only", default="", help="comma list of scene sheets, e.g. s03,s04 (-> sfx/build/mix_s03_s04.wav)")
    ap.add_argument("--sheet", default="", help="render these cue-sheet file(s) only (comma list) -> sfx/build/mix_sheet.wav")
    ap.add_argument("--out", default="", help="output path override")
    ap.add_argument("--check", action="store_true", help="validate cue sheets only")
    ap.add_argument("--audit", action="store_true", help="print per-cue audibility vs the music")
    ap.add_argument("--stems", action="store_true", help="also write sfx/build/stem_sfx.wav + stem_music.wav")
    ap.add_argument("--no-duck", action="store_true", help="disable music ducking under impacts")
    ap.add_argument("--no-cache", action="store_true", help="ignore/skip the one-shot disk cache")
    ap.add_argument("--music-db", type=float, default=MUSIC_DB, help="music bed gain in dB (default -3)")
    ap.add_argument("--quiet", action="store_true")
    return ap.parse_args(argv)


ARGS = None
if __name__ == "__main__":
    ARGS = parse()
    sys.exit(main())
