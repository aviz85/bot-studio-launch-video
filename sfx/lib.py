"""
Bot Studio launch film - procedural SFX library (48 kHz stereo, deterministic).

Every public sound is a function ``name(**params) -> Sound`` where ``Sound`` is a
float64 ``np.ndarray`` of shape (n, 2) with one extra attribute:

    sound.sync   sample index inside the one-shot that lands ON the cue frame
                 (transient for hits, loudest pass for whooshes, the cut for
                 risers / reverse swells, the first event for UI sounds).

All sounds are peak-normalised to -1 dBFS at gain 0 dB, DC-free, start and end
at zero, and are a pure function of their parameters (``seed`` varies the
random micro-details). The film's key is F minor and the tempo is 134 BPM, so
tonal defaults (blip/confirm/flare/sparkle/hum) sit in key.

CLI:
    python3 sfx/lib.py list                         # names + params
    python3 sfx/lib.py render whoosh '{"dur":1.2}'  # -> sfx/build/audition/whoosh.wav
"""
from __future__ import annotations

import functools
import inspect
import json
import re
import sys
import zlib

import numpy as np
from scipy import signal

SR = 48000
FPS = 60
BEAT = 0.44776219579374094  # seconds per beat (134 BPM)
KEY = "F minor"
TAU = 2.0 * np.pi

# F natural minor and F minor pentatonic (semitones above F)
_MINOR = [0, 2, 3, 5, 7, 8, 10]
_PENTA = [0, 3, 5, 7, 10]


# --------------------------------------------------------------------------
# Sound container
# --------------------------------------------------------------------------
class Sound(np.ndarray):
    """(n, 2) float64 stereo buffer with a ``sync`` sample index."""

    def __new__(cls, arr, sync=0):
        obj = np.asarray(arr, dtype=np.float64).view(cls)
        obj.sync = int(sync)
        return obj

    def __array_finalize__(self, obj):
        self.sync = getattr(obj, "sync", 0)


# --------------------------------------------------------------------------
# Basic helpers
# --------------------------------------------------------------------------
def _rng(seed, salt):
    return np.random.default_rng([int(seed) & 0xFFFFFFFF, zlib.crc32(salt.encode())])


def _n(sec):
    return max(1, int(round(min(float(sec), 90.0) * SR)))  # safety cap: nothing longer than the film


def _t(n):
    return np.arange(n) / SR


def _full(v, n):
    a = np.asarray(v, dtype=np.float64)
    return np.full(n, float(a)) if a.ndim == 0 else a[:n]


def _st(x):
    """mono -> (n, 2)"""
    x = np.asarray(x, dtype=np.float64)
    return np.stack([x, x], 1) if x.ndim == 1 else x


def _pad(x, n):
    x = _st(x)
    if len(x) >= n:
        return x[:n]
    return np.concatenate([x, np.zeros((n - len(x), 2))])


def _db(v):
    return 10 ** (v / 20.0)


def note_hz(note):
    """'C6', 'Ab5', 'F#4' or a MIDI number -> Hz."""
    if isinstance(note, (int, float, np.integer, np.floating)):
        return 440.0 * 2 ** ((float(note) - 69) / 12)
    m = re.match(r"^\s*([A-Ga-g])([#b]?)(-?\d+)\s*$", str(note))
    if not m:
        raise ValueError(f"bad note name {note!r} (use e.g. 'C6', 'Ab5', 'F#4' or a MIDI number)")
    semis = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[m.group(1).upper()]
    semis += {"#": 1, "b": -1, "": 0}[m.group(2)]
    midi = 12 * (int(m.group(3)) + 1) + semis
    return 440.0 * 2 ** ((midi - 69) / 12)


def _scale_hz(degree, octave=6, scale=_PENTA):
    """F-minor scale degree (can exceed len(scale)) -> Hz."""
    o, d = divmod(int(degree), len(scale))
    midi = 12 * (octave + 1 + o) + 5 + scale[d]
    return 440.0 * 2 ** ((midi - 69) / 12)


# --------------------------------------------------------------------------
# Envelopes / LFOs
# --------------------------------------------------------------------------
def env_ad(n, attack=0.002, t60=0.5, hold=0.0):
    """Smooth attack (sin^2) then exponential decay reaching -60 dB after t60 s."""
    t = _t(n)
    a = np.clip(t / max(attack, 1e-6), 0, 1)
    a = np.sin(a * np.pi / 2) ** 2
    d = 10 ** (-3.0 * np.maximum(t - attack - hold, 0) / max(t60, 1e-4))
    return a * d


def env_pts(n, pts, power=1.0):
    """Piecewise-linear envelope through [(t_sec, value), ...] (optionally ^power)."""
    ts = np.array([p[0] for p in pts], float)
    vs = np.array([p[1] for p in pts], float)
    e = np.interp(_t(n), ts, vs)
    return e ** power if power != 1.0 else e


def edges(n, fade_in=0.005, fade_out=0.01):
    """Raised-cosine fade in/out window."""
    e = np.ones(n)
    a = min(n // 2, max(0, int(fade_in * SR)))
    b = min(n // 2, max(0, int(fade_out * SR)))
    if a > 0:
        e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if b > 0:
        e[n - b:] *= np.cos(np.linspace(0, np.pi / 2, b)) ** 2
    return e


def lfo_rand(n, rate, rng, smooth=True):
    """Smooth random LFO in [-1, 1] with ~rate changes per second."""
    k = int(n / SR * rate) + 4
    pts = rng.uniform(-1, 1, k)
    xs = np.linspace(0, n, k)
    if smooth:
        from scipy.interpolate import CubicSpline
        y = CubicSpline(xs, pts, bc_type="natural")(np.arange(n))
        return np.clip(y, -1.2, 1.2)
    return np.interp(np.arange(n), xs, pts)


# --------------------------------------------------------------------------
# Filters
# --------------------------------------------------------------------------
def _rbj(kind, fc, q=0.707, gain_db=0.0):
    fc = float(np.clip(fc, 5.0, 0.47 * SR))
    q = max(float(q), 0.05)
    w0 = TAU * fc / SR
    cw, sw = np.cos(w0), np.sin(w0)
    al = sw / (2 * q)
    A = 10 ** (gain_db / 40)
    if kind == "lp":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + al, -2 * cw, 1 - al]
    elif kind == "hp":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + al, -2 * cw, 1 - al]
    elif kind == "bp":
        b = [al, 0.0, -al]
        a = [1 + al, -2 * cw, 1 - al]
    elif kind == "peak":
        b = [1 + al * A, -2 * cw, 1 - al * A]
        a = [1 + al / A, -2 * cw, 1 - al / A]
    else:
        raise ValueError(kind)
    return np.array(b + a) / a[0]


def filt(x, kind, fc, q=0.707, gain_db=0.0, stages=1):
    """Static RBJ biquad (lp/hp/bp/peak), cascaded ``stages`` times."""
    sos = np.tile(_rbj(kind, fc, q, gain_db), (stages, 1))
    return signal.sosfilt(sos, x, axis=0)


def lp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, min(fc, 0.47 * SR), "low", fs=SR, output="sos"), x, axis=0)


def hp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, max(fc, 5.0), "high", fs=SR, output="sos"), x, axis=0)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [max(lo, 5.0), min(hi, 0.47 * SR)], "band", fs=SR, output="sos"), x, axis=0)


def tvf(x, kind, fc, q=0.707, stages=1, block=None):
    """Time-varying RBJ filter: ``fc``/``q`` may be per-sample arrays. Block-wise with state carry."""
    x = np.asarray(x, dtype=np.float64)
    mono = x.ndim == 1
    x2 = x[:, None] if mono else x
    n, C = x2.shape
    fc = _full(fc, n)
    q = _full(q, n)
    block = block or (64 if n < 3 * SR else 128)
    out = np.empty_like(x2)
    zi = np.zeros((stages, 2, C))
    for s in range(0, n, block):
        e = min(n, s + block)
        m = (s + e) // 2
        sos = np.tile(_rbj(kind, fc[m], q[m]), (stages, 1))
        out[s:e], zi = signal.sosfilt(sos, x2[s:e], axis=0, zi=zi)
    return out[:, 0] if mono else out


def stft_shape(x, mask_fn, nfft=1024, hop=256):
    """Multiply x's STFT by ``mask_fn(tf, f) -> (F, T)`` and resynthesise (same length)."""
    x = np.asarray(x, dtype=np.float64)
    mono = x.ndim == 1
    x2 = (x[:, None] if mono else x).T
    n = x2.shape[1]
    f, tf, Z = signal.stft(x2, fs=SR, window="hann", nperseg=nfft, noverlap=nfft - hop)
    M = mask_fn(tf, f)
    Z = Z * M
    _, y = signal.istft(Z, fs=SR, window="hann", nperseg=nfft, noverlap=nfft - hop)
    y = y[:, :n]
    if y.shape[1] < n:
        y = np.pad(y, ((0, 0), (0, n - y.shape[1])))
    return y[0] if mono else y.T


def _logband(f, fc, sig):
    """Gaussian band on log2-frequency. f (F,), fc/sig (T,) -> (F, T)."""
    lf = np.log2(np.maximum(f, 15.0)[:, None] / np.maximum(fc, 15.0)[None, :])
    return np.exp(-0.5 * (lf / np.maximum(sig, 0.05)[None, :]) ** 2)


# --------------------------------------------------------------------------
# Noise / oscillators / shapers
# --------------------------------------------------------------------------
def noise(n, rng, color="white"):
    w = rng.standard_normal(n)
    if color == "white":
        return w
    W = np.fft.rfft(w)
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = f[1] if n > 1 else 1.0
    W /= np.sqrt(f) if color == "pink" else f
    y = np.fft.irfft(W, n)
    return y / (np.std(y) + 1e-12)


def stereo_noise(n, rng, corr=0.3, color="white"):
    a = noise(n, rng, color)
    b = noise(n, rng, color)
    return np.stack([a, corr * a + np.sqrt(max(0.0, 1 - corr * corr)) * b], 1)


def phase(freq, n, ph0=0.0):
    """Phase in cycles from (array) frequency."""
    return ph0 + np.cumsum(_full(freq, n)) / SR


def sine(freq, n, ph0=0.0):
    return np.sin(TAU * phase(freq, n, ph0))


def _polyblep(t, dt):
    y = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]
    y[m] = x + x - x * x - 1.0
    m = t > 1.0 - dt
    x = (t[m] - 1.0) / dt[m]
    y[m] = x * x + x + x + 1.0
    return y


def saw(freq, n, ph0=0.0):
    """Band-limited (polyBLEP) sawtooth."""
    dt = np.clip(np.abs(_full(freq, n)) / SR, 1e-7, 0.45)
    t = (ph0 + np.cumsum(dt)) % 1.0
    return 2.0 * t - 1.0 - _polyblep(t, dt)


def square(freq, n, ph0=0.0, pw=0.5):
    dt = np.clip(np.abs(_full(freq, n)) / SR, 1e-7, 0.45)
    t1 = (ph0 + np.cumsum(dt)) % 1.0
    t2 = (t1 + pw) % 1.0
    s1 = 2 * t1 - 1 - _polyblep(t1, dt)
    s2 = 2 * t2 - 1 - _polyblep(t2, dt)
    return 0.5 * (s1 - s2)


def supersaw(freq, n, rng, voices=7, detune=18.0, stereo=True):
    """Detuned saw stack (detune in cents). Returns (n, 2)."""
    f = _full(freq, n)
    out = np.zeros((n, 2))
    for i in range(voices):
        d = 0.0 if voices == 1 else detune * (2 * i / (voices - 1) - 1)
        v = saw(f * 2 ** (d / 1200), n, rng.random())
        p = 0.0 if not stereo or voices == 1 else (2 * i / (voices - 1) - 1) * 0.8
        th = (p + 1) * np.pi / 4
        out[:, 0] += v * np.cos(th) * np.sqrt(2)
        out[:, 1] += v * np.sin(th) * np.sqrt(2)
    return out / np.sqrt(voices)


def sat(x, drive=1.0):
    """tanh saturation normalised so that full scale stays ~full scale."""
    if drive <= 1e-3:
        return x
    return np.tanh(x * drive) / np.tanh(drive)


def crush(x, bits=6, hold=1):
    q = 2.0 ** (bits - 1)
    y = np.round(x * q) / q
    if hold > 1:
        idx = (np.arange(len(y)) // hold) * hold
        y = y[idx]
    return y


def pan_mono(x, p):
    """Equal-power pan of a mono signal (center = unity in both channels)."""
    th = (np.clip(_full(p, len(x)), -1, 1) + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], 1) * np.sqrt(2)


def balance(x, p):
    """Pan a stereo signal (time-varying p allowed)."""
    x = _st(x)
    th = (np.clip(_full(p, len(x)), -1, 1) + 1) * np.pi / 4
    gl = np.minimum(np.cos(th) * np.sqrt(2), 1.0)
    gr = np.minimum(np.sin(th) * np.sqrt(2), 1.0)
    # bleed the attenuated side across so hard-panned sounds keep their energy
    pl = np.clip(-_full(p, len(x)), 0, 1)
    pr = np.clip(_full(p, len(x)), 0, 1)
    L = x[:, 0] * gl + x[:, 1] * (1 - gr) * pl * 0.7
    R = x[:, 1] * gr + x[:, 0] * (1 - gl) * pr * 0.7
    return np.stack([L, R], 1)


def widen(x, amount=1.0):
    x = _st(x)
    m = (x[:, 0] + x[:, 1]) * 0.5
    s = (x[:, 0] - x[:, 1]) * 0.5 * amount
    return np.stack([m + s, m - s], 1)


def er_width(x, amount=0.3):
    """Mono -> stereo with two quiet early reflections (7/11 ms) on opposite sides (mono-safe)."""
    a, b = int(0.0071 * SR), int(0.0113 * SR)
    L = x.copy()
    R = x.copy()
    L[a:] += x[:-a] * 0.3 * amount
    R[b:] += x[:-b] * 0.3 * amount
    return np.stack([L, R], 1)


def haas(x, ms=0.4, side=1):
    """Mono -> stereo by delaying one side a fraction of a millisecond."""
    d = int(ms * SR / 1000)
    y = np.concatenate([np.zeros(d), x])[: len(x)]
    return np.stack([x, y], 1) if side > 0 else np.stack([y, x], 1)


# --------------------------------------------------------------------------
# Reverb (synthetic IR convolution)
# --------------------------------------------------------------------------
@functools.lru_cache(maxsize=24)
def _ir(rt60=1.6, damp=5000.0, predelay_ms=12.0, seed=7, width=1.0, lowcut=120.0):
    rng = _rng(seed, f"ir{rt60}{damp}")
    L = _n(min(8.0, rt60 * 1.15 + 0.08))
    nz = stereo_noise(L, rng, corr=0.0)

    def mask(tf, f):
        t60 = rt60 / (1.0 + (f[:, None] / damp) ** 1.4)
        t60 = np.maximum(t60, 0.05)
        return 10 ** (-3.0 * tf[None, :] / t60)

    y = stft_shape(nz, mask, 1024, 256)
    y *= (1 - np.exp(-_t(L) / 0.01))[:, None]  # diffusion build-up
    # sparse early reflections
    for _ in range(12):
        tt = rng.uniform(0.003, 0.06)
        i = int(tt * SR)
        g = rng.uniform(0.3, 0.9) * np.exp(-tt / 0.05) * 6.0
        c = rng.integers(0, 2)
        y[i, c] += g
        y[min(L - 1, i + rng.integers(5, 60)), 1 - c] += g * 0.6
    y = hp(y, lowcut)
    y = lp(y, min(16000.0, damp * 3))
    pd = int(predelay_ms * SR / 1000)
    y = np.concatenate([np.zeros((pd, 2)), y])
    y = widen(y, width)
    y /= np.sqrt(np.mean(np.sum(y ** 2, 0)))
    y.setflags(write=False)
    return y


def reverb(x, rt60=1.6, mix=0.3, damp=5000.0, predelay_ms=12.0, width=1.0, seed=7, lowcut=120.0, dry=1.0):
    """Convolution reverb with a synthetic stereo IR. Returns longer buffer (n + IR)."""
    x = _st(x)
    ir = _ir(round(float(rt60), 3), float(damp), float(predelay_ms), int(seed), float(width), float(lowcut))
    a = x[:, 0] * 0.75 + x[:, 1] * 0.25
    b = x[:, 1] * 0.75 + x[:, 0] * 0.25
    wl = signal.oaconvolve(a, ir[:, 0])
    wr = signal.oaconvolve(b, ir[:, 1])
    out = np.stack([wl, wr], 1) * mix
    out[: len(x)] += x * dry
    return out


def _pre_swell(pre, rng, bright=0.5, rt=None):
    """Reverse-reverb swell of length ``pre`` s ending at its last sample (for hits)."""
    n = _n(pre)
    burst = hp(rng.standard_normal(_n(0.03)) * env_ad(_n(0.03), 0.0005, 0.03), 400 + 2000 * bright)
    w = reverb(burst, rt60=rt or max(0.4, pre * 1.6), mix=1.0, dry=0.0, damp=3000 + 6000 * bright, predelay_ms=0, seed=int(rng.integers(1 << 30)))
    w = w[:n]
    w = _pad(w, n)[::-1]
    w *= env_pts(n, [(0, 0), (pre * 0.3, 0.4), (pre, 1.0)], power=1.5)[:, None]
    w /= np.abs(w).max() + 1e-12
    return w * edges(n, 0.01, 0.002)[:, None]


# --------------------------------------------------------------------------
# Finishing
# --------------------------------------------------------------------------
def _finish(x, sync=0, peak_db=-1.0, fade_in_ms=0.6, fade_out_ms=12.0, hp_hz=16.0, trim_db=-80.0):
    x = _st(np.nan_to_num(np.asarray(x, dtype=np.float64), nan=0.0, posinf=0.0, neginf=0.0))
    if hp_hz:
        x = hp(x, hp_hz)
    pk = np.abs(x).max()
    if pk < 1e-12:
        return Sound(np.zeros((max(len(x), 1), 2)), sync)
    # trim trailing silence (never before sync)
    thr = pk * 10 ** (trim_db / 20)
    loud = np.nonzero(np.abs(x).max(1) > thr)[0]
    end = max(int(loud[-1]) + 1 if len(loud) else len(x), int(sync) + 1)
    x = x[: min(len(x), end + int(0.005 * SR))]
    x = x * edges(len(x), fade_in_ms / 1000, fade_out_ms / 1000)[:, None]
    x = x - 0.0  # (DC already removed by the high-pass)
    x *= 10 ** (peak_db / 20) / (np.abs(x).max() + 1e-12)
    return Sound(x, min(int(sync), len(x) - 1))


# ==========================================================================
#                                  SOUNDS
# ==========================================================================
_DIR = {"lr": 1.0, "rl": -1.0, "none": 0.0, "center": 0.0, "c": 0.0, "l": -1.0, "r": 1.0}


def _dir(direction):
    if isinstance(direction, (int, float)):
        return float(np.clip(direction, -1, 1))
    try:
        return _DIR[str(direction).lower()]
    except KeyError:
        raise ValueError(f"direction must be 'lr', 'rl' or 'none' (got {direction!r})")


def _passby(n, tp, w_in, w_out):
    """Closeness (0..1, 1 at tp) and azimuth (-1..1) of a source passing the camera."""
    u = _t(n) - tp
    w = np.where(u < 0, w_in, w_out)
    prox = 1.0 / (1.0 + (u / w) ** 2)
    az = u / np.sqrt(w ** 2 + u ** 2)
    return prox, az


def _air_noise(n, rng, fc, bw, corr=0.35, tilt=-0.35, air=0.0, air_curve=None, nfft=1024, hop=256):
    """Stereo noise through a moving log-gaussian band (+ optional moving air shelf)."""
    t = _t(n)
    fc = _full(fc, n)
    bw = _full(bw, n)
    ac = _full(air_curve if air_curve is not None else 0.0, n)
    nz = stereo_noise(n, rng, corr)

    def mask(tf, f):
        fcf = np.interp(tf, t, fc)
        bwf = np.interp(tf, t, bw)
        M = _logband(f, fcf, bwf)
        if air > 0:
            acf = np.interp(tf, t, ac)
            shelf = 1.0 / (1.0 + (5000.0 / np.maximum(f, 20)) ** 4)
            M = M + air * shelf[:, None] * acf[None, :]
        return M * (np.maximum(f, 40) / 1000.0)[:, None] ** tilt

    return stft_shape(nz, mask, nfft, hop)


# ------------------------------ MOTION ------------------------------------
def whoosh(dur=0.8, peak=0.6, pitch=1.0, brightness=0.6, direction="lr", width=0.85,
           weight=0.4, tone=0.12, air=0.35, seed=1):
    """Air swoosh: noise through a moving band-pass with doppler shift and an L/R pan sweep.

    dur        total length in s (0.3 short ... 2.0 long)
    peak       where the loudest pass sits, fraction of dur (sync point)
    pitch      scales band frequencies (0.5 dark/huge ... 2 small/fast)
    brightness 0..1 amount of top end / air at the pass
    direction  'lr' | 'rl' | 'none'
    width      0..1 stereo travel of the pan sweep
    weight     0..1 low-mid body
    tone       0..1 subtle tonal doppler (sci-fi craft) layer
    air        0..1 hiss shelf at the pass
    """
    rng = _rng(seed, "whoosh")
    n = _n(dur)
    tp = float(np.clip(peak, 0.1, 0.95)) * dur
    prox, az = _passby(n, tp, max(0.015, 0.3 * tp), max(0.015, 0.22 * (dur - tp)))
    win = edges(n, 0.3 * tp, 0.45 * (dur - tp))
    amp = prox * win
    d = _dir(direction)
    dop = 1.0 / (1.0 + 0.16 * az)
    fc = pitch * (550 + 2100 * prox ** 1.4 * (0.5 + brightness)) * dop
    bw = 0.9 + 0.9 * prox
    y = _air_noise(n, rng, fc, bw, corr=0.45, tilt=-0.55 + 0.2 * brightness, air=air * (0.3 + brightness), air_curve=prox ** 2)
    y *= amp[:, None]
    body = lp(hp(rng.standard_normal(n), 60), 320 * pitch) * amp ** 1.4 * weight * 1.4
    y += pan_mono(body, d * width * az * 0.6)
    if tone > 0:
        ft = 190 * pitch * dop * (1 + 0.25 * prox)
        tn = 0.6 * sine(ft, n) + 0.25 * saw(ft * 2.003, n, rng.random()) + 0.2 * sine(ft * 1.498, n)
        tn = lp(tn, 1600 * pitch) * amp ** 1.6 * tone * 1.8
        y += pan_mono(tn, d * width * az)
    y = balance(y, d * width * az)
    y = sat(y / (np.abs(y).max() + 1e-9), 1.2)
    return _finish(y, tp * SR)


def whip(dur=0.28, pitch=1.0, brightness=0.7, direction="lr", width=0.9, seed=1):
    """Very short fast swish for whip pans ('fwip'). Sync = the snap (≈62% of dur)."""
    rng = _rng(seed, "whip")
    n = _n(dur)
    tp = 0.62 * dur
    prox, az = _passby(n, tp, 0.2 * tp, 0.14 * (dur - tp))
    amp = prox ** 1.3 * edges(n, 0.25 * tp, 0.5 * (dur - tp))
    dop = 1.0 / (1.0 + 0.25 * az)
    fc = pitch * (900 + 3600 * prox ** 1.2 * (0.5 + brightness)) * dop
    y = _air_noise(n, rng, fc, 0.55 + 0.8 * prox, corr=0.5, tilt=-0.45, air=0.4 * brightness,
                   air_curve=prox ** 3, nfft=512, hop=64)
    y *= amp[:, None]
    # tiny cloth 'crack' right at the snap
    i0 = int(tp * SR)
    crack = hp(rng.standard_normal(_n(0.012)), 2500) * env_ad(_n(0.012), 0.0008, 0.012)
    y[i0:i0 + len(crack)] += _pad(crack, len(crack))[: n - i0] * 0.25 * brightness
    d = _dir(direction)
    y = balance(y, d * width * az)
    return _finish(sat(y / (np.abs(y).max() + 1e-9), 1.3), i0, fade_out_ms=6)


def fly_by(dur=2.4, pitch=1.0, rumble=0.7, engine=0.6, brightness=0.6, direction="lr", width=1.0, seed=1):
    """Big pass-by: jet noise + doppler engine tone + low rumble. Sync = closest pass (middle).

    rumble 0..1 low-end weight; engine 0..1 tonal doppler 'neeyow' amount.
    """
    rng = _rng(seed, "fly_by")
    n = _n(dur)
    tp = 0.5 * dur
    prox, az = _passby(n, tp, 0.16 * dur, 0.13 * dur)
    amp = prox * edges(n, 0.2 * dur, 0.3 * dur)
    dop = 1.0 / (1.0 + 0.28 * az)
    d = _dir(direction)
    pan = d * width * az
    fc = pitch * (400 + 2600 * prox ** 1.5 * (0.4 + brightness)) * dop
    jet = _air_noise(n, rng, fc, 1.1 + 0.8 * prox, corr=0.4, tilt=-0.4, air=0.5 * brightness, air_curve=prox ** 2)
    jet *= amp[:, None]
    f0 = 98 * pitch * dop
    eng = supersaw(f0, n, rng, voices=5, detune=14, stereo=False)[:, 0]
    eng += 0.5 * square(f0 * 0.5, n, rng.random())
    eng = tvf(eng, "lp", 300 + 3500 * prox ** 1.5, 1.2)
    eng *= amp ** 1.3 * engine
    rum = lp(noise(n, rng, "brown"), 140) * 1.4 + 0.6 * sine(46 * pitch * dop, n)
    rum *= (prox ** 0.8 * edges(n, 0.25 * dur, 0.35 * dur)) * rumble
    y = 0.8 * jet + pan_mono(0.5 * eng, pan) + pan_mono(rum, pan * 0.4)
    y = balance(y, pan * 0.85)
    y = reverb(y, rt60=1.4, mix=0.12, damp=4000, seed=seed)[: n + _n(0.6)]
    return _finish(sat(y / (np.abs(y).max() + 1e-9), 1.4), tp * SR)


def swoosh_rev(dur=1.0, pitch=1.0, brightness=0.6, direction="none", width=0.7, seed=1):
    """Reverse swell (reverse reverb + rising band) that ends in a hard cut. Sync = the cut (end)."""
    rng = _rng(seed, "swoosh_rev")
    n = _n(dur)
    p = _t(n) / dur
    fc = pitch * 350 * 2 ** (3.6 * p ** 1.3) * (0.6 + 0.6 * brightness)
    y = _air_noise(n, rng, fc, 1.2 + 0.4 * p, corr=0.3, tilt=-0.5, air=0.3 * brightness, air_curve=p ** 3)
    y *= (p ** 2.6)[:, None]
    rv = _pre_swell(dur, rng, brightness, rt=dur * 1.3)
    y = y / (np.abs(y).max() + 1e-9) + 0.7 * rv
    d = _dir(direction)
    y = balance(y, d * width * (p - 1.0))  # travels from the side into center
    return _finish(sat(y / (np.abs(y).max() + 1e-9), 1.3), n - 1, fade_out_ms=2.5)


def shockwave(dur=1.6, pitch=1.0, brightness=0.6, seed=1):
    """Expanding blast for shockwave wipes: low thump + downward air burst + crackle, widening in stereo. Sync = onset."""
    rng = _rng(seed, "shockwave")
    n = _n(dur)
    t = _t(n)
    f = 38 * pitch + 70 * pitch * np.exp(-t / 0.05)
    thump = sat(sine(f, n) * env_ad(n, 0.002, 0.7), 1.6)
    fc = pitch * (250 + 5000 * (0.5 + brightness) * np.exp(-t / 0.18))
    air = _air_noise(n, rng, fc, 1.4, corr=0.2, tilt=-0.4) * env_ad(n, 0.004, 1.1)[:, None]
    cr = np.zeros(n)
    k = int(140 * dur)
    pos = (rng.random(k) ** 2.2 * n * 0.7).astype(int)
    cr[pos] = rng.uniform(-1, 1, k)
    cr = hp(cr, 1500) * env_ad(n, 0.01, 0.8) * brightness
    crs = np.stack([cr, np.roll(cr, 37)], 1)
    y = _st(thump) * 0.9 + air * 0.9 + crs * 1.5
    w = np.clip(t / 0.5, 0, 1) ** 0.7
    y = np.stack([y[:, 0], y[:, 1]], 1)
    m = (y[:, 0] + y[:, 1]) * 0.5
    s = (y[:, 0] - y[:, 1]) * 0.5 * (0.3 + 1.4 * w)
    y = np.stack([m + s, m - s], 1)
    y = reverb(y, rt60=1.8, mix=0.2, damp=4500, seed=seed)
    return _finish(sat(y / (np.abs(y).max() + 1e-9), 1.3), 0)


# ------------------------------ IMPACTS -----------------------------------
def impact(dur=3.0, pitch=1.0, punch=1.0, brightness=0.5, tail=1.0, sub=1.0, pre=0.0, seed=1):
    """Cinematic hit: sub-drop sine + punchy transient + noise body + hall tail.

    pitch 0.6..1.5 (sub/body tuning) | punch 0..1.5 transient | brightness 0..1 crack/body top
    tail 0.3..2 tail length | sub 0..1.5 sub amount | pre 0..1.5 s reverse swell BEFORE the hit
    Sync = the transient (pre-swell, if any, plays before the cue frame).
    """
    rng = _rng(seed, "impact")
    n = _n(dur)
    t = _t(n)
    f = 42 * pitch + 95 * pitch * np.exp(-t / 0.045)
    s = sat(sine(f, n) * env_ad(n, 0.0015, 1.3 * tail), 2.0)
    knock = sine(165 * pitch * (1 + 0.5 * np.exp(-t / 0.01)), n) * env_ad(n, 0.0005, 0.12)
    nz = stereo_noise(n, rng, 0.2)
    crack = bp(nz, 1500, 9000) * env_ad(n, 0.0002, 0.035)[:, None]
    crack += hp(nz[::-1], 5000) * env_ad(n, 0.0001, 0.012)[:, None] * 0.6
    fcb = 220 + 6500 * (0.35 + brightness) * np.exp(-t / 0.09)
    body = tvf(stereo_noise(n, rng, 0.3), "lp", fcb, 0.9) * env_ad(n, 0.001, 0.8 * tail)[:, None]
    modes = np.zeros(n)
    for fr, dc, a in [(57, 0.7, 1.0), (91, 0.45, 0.6), (139, 0.3, 0.45), (212, 0.18, 0.3)]:
        modes += a * np.sin(TAU * fr * pitch * t + rng.random() * TAU) * env_ad(n, 0.001, dc * tail)
    rum = lp(stereo_noise(n, rng, 0.3, "brown"), 150) * env_ad(n, 0.03, 2.4 * tail)[:, None]
    thud = bp(stereo_noise(n, rng, 0.6, "pink"), 90 * pitch, 900 * pitch) * env_ad(n, 0.001, 0.45 * tail)[:, None]
    thud /= np.abs(thud).max() + 1e-9
    body /= np.abs(body).max() + 1e-9
    crack /= np.abs(crack).max() + 1e-9
    hit = (0.9 * crack * punch * (0.4 + brightness) + 1.1 * body + 1.0 * thud
           + _st(0.6 * knock * punch + 0.4 * modes))
    wet = reverb(hit, rt60=2.0 * tail, mix=0.4, damp=4500, predelay_ms=10, seed=seed)[:n]
    s = s + 0.25 * lp(sat(s, 5.0) - s, 600)  # harmonics so the sub reads on laptops
    y = _st(0.62 * s * sub) + wet + 0.3 * rum
    y = sat(y / (np.abs(y).max() + 1e-9), 1.25)
    sync = 0
    if pre > 0:
        sw = _pre_swell(pre, rng, brightness) * 0.45
        y = np.concatenate([sw, y])
        sync = len(sw)
    return _finish(y, sync)


def boom(dur=5.5, pitch=1.0, brightness=0.5, tail=1.0, pre=0.0, seed=1):
    """Huge sub boom for drops / the final hit: deep pitch-dropping sub, explosion body, crack, long wide tail.

    Sync = the hit. pre = optional reverse swell (s) before it.
    """
    rng = _rng(seed, "boom")
    n = _n(dur)
    t = _t(n)
    f = 29 * pitch + 85 * pitch * np.exp(-t / 0.11)
    s = sat(sine(f, n) * env_ad(n, 0.002, 3.0 * tail), 2.4)
    s2 = sine(f * 2.0, n) * env_ad(n, 0.002, 0.6) * 0.25
    whomp = sine(60 * pitch + 260 * pitch * np.exp(-t / 0.02), n) * env_ad(n, 0.0005, 0.18)
    nz = stereo_noise(n, rng, 0.15)
    crack = bp(nz, 1200, 10000) * env_ad(n, 0.0002, 0.06)[:, None]
    fcb = 90 + 4500 * (0.3 + brightness) * np.exp(-t / 0.35)
    fire = tvf(stereo_noise(n, rng, 0.2, "pink"), "lp", fcb, 0.8, stages=2) * env_ad(n, 0.004, 2.2 * tail)[:, None]
    rum = lp(stereo_noise(n, rng, 0.3, "brown"), 110) * env_ad(n, 0.05, 4.0 * tail)[:, None]
    thud = bp(stereo_noise(n, rng, 0.5, "pink"), 70 * pitch, 700 * pitch) * env_ad(n, 0.002, 0.9 * tail)[:, None]
    thud /= np.abs(thud).max() + 1e-9
    fire /= np.abs(fire).max() + 1e-9
    crack /= np.abs(crack).max() + 1e-9
    hit = 0.8 * crack * (0.4 + brightness) + 1.2 * fire + 0.9 * thud + _st(0.7 * whomp)
    wet = reverb(hit, rt60=3.2 * tail, mix=0.5, damp=3500, predelay_ms=18, seed=seed, width=1.2)[:n]
    s = s + 0.25 * lp(sat(s, 5.0) - s, 500)
    y = _st(0.7 * s + s2) + wet + 0.5 * rum
    y = sat(y / (np.abs(y).max() + 1e-9), 1.3)
    sync = 0
    if pre > 0:
        sw = _pre_swell(pre, rng, brightness) * 0.4
        y = np.concatenate([sw, y])
        sync = len(sw)
    return _finish(y, sync, fade_out_ms=60)


def sub_drop(dur=2.0, pitch=1.0, drive=1.5, seed=1):
    """Pure sub drop: sine gliding ~95 Hz -> ~28 Hz, saturated so it reads on small speakers. Sync = onset."""
    n = _n(dur)
    p = _t(n) / dur
    f = pitch * (28 + 67 * (1 - p) ** 2.2)
    y = sine(f, n) * env_pts(n, [(0, 0), (0.004, 1), (dur * 0.55, 0.8), (dur, 0)], 1.4)
    y = sat(y, drive)
    y = y + 0.08 * lp(sat(y, 4.0), 400)
    return _finish(_st(y), 0, fade_out_ms=40, hp_hz=14)


def hit_metal(dur=2.5, pitch=1.0, brightness=0.7, material="metal", weight=0.4, tail=1.0, seed=1):
    """Bright metallic/glass hit (modal synthesis). material 'metal' | 'glass'. Sync = onset."""
    rng = _rng(seed, "hit_metal")
    n = _n(dur)
    t = _t(n)
    glass = str(material) == "glass"
    f0 = (1150.0 if glass else 480.0) * pitch
    ratios = [1, 2.32, 4.25, 6.63, 9.38, 12.6] if glass else [1, 2.756, 5.404, 8.933, 13.34, 1.51, 3.97, 7.2]
    y = np.zeros((n, 2))
    for k, r in enumerate(ratios):
        fr = f0 * r * (1 + rng.normal(0, 0.003))
        if fr > 19000:
            continue
        a = (1.0 / (1 + k) ** 0.55) * (0.5 + brightness * (k / len(ratios)))
        dc = tail * (1.9 if not glass else 1.2) / (1 + 0.55 * k * (1.2 - 0.5 * brightness))
        for c, det in enumerate([-1, 1]):
            fd = fr * (1 + det * 0.0015 * (1 + k * 0.3))
            y[:, c] += a * np.sin(TAU * fd * t + rng.random() * TAU) * env_ad(n, 0.0004, dc)
    nz = stereo_noise(n, rng, 0.3)
    strike = bp(nz, 2500, 14000) * env_ad(n, 0.0001, 0.02)[:, None] * (0.6 + brightness)
    thump = sine(140 * pitch * (1 + np.exp(-t / 0.01)), n) * env_ad(n, 0.0005, 0.12) * weight
    y = y / (np.abs(y).max() + 1e-9) + 0.5 * strike + _st(thump)
    y = reverb(y, rt60=1.8 * tail, mix=0.25, damp=7000, seed=seed)
    return _finish(sat(y / (np.abs(y).max() + 1e-9), 1.1), 0, fade_out_ms=40)


def stamp(dur=0.7, pitch=1.0, weight=0.55, clack=1.0, ring=0.25, seed=1):
    """UI slam / thud for cards and panels landing: sub thump + 'thock' body + upper-mid clack.
    weight 0..1 low thump | clack 0..1 hard 2 kHz snap (cuts through dense music) | ring 0..1 glassy overtone.
    Sync = onset."""
    rng = _rng(seed, "stamp")
    n = _n(dur)
    t = _t(n)
    f = 52 * pitch + 110 * pitch * np.exp(-t / 0.022)
    th = sat(sine(f, n) * env_ad(n, 0.0008, 0.22), 2.2) * (0.2 + weight)
    nz = rng.standard_normal(n)
    thock = filt(nz, "bp", 900 * pitch, 1.2) * env_ad(n, 0.0004, 0.06)
    thock = thock / (np.abs(thock).max() + 1e-9) * 1.1
    knock = np.sin(TAU * 210 * pitch * _t(n)) * env_ad(n, 0.0004, 0.08) * 0.7
    click = hp(nz[::-1], 3000) * env_ad(n, 0.0001, 0.006)
    click = click / (np.abs(click).max() + 1e-9) * 0.35
    tn = _t(n)
    ck = filt(rng.standard_normal(n), "bp", 2200 * pitch, 2.0) * env_ad(n, 0.0002, 0.022)
    ck = ck / (np.abs(ck).max() + 1e-9)
    ck += (0.5 * np.sin(TAU * 1750 * pitch * tn) + 0.35 * np.sin(TAU * 2930 * pitch * tn)) * env_ad(n, 0.0003, 0.03)
    y = _st(th + thock + knock + click + 1.0 * clack * ck)
    if ring > 0:
        g = glass_tick(pitch=pitch * 0.8, seed=seed)
        y += _pad(g, n) * ring * 0.35
    y = reverb(y, rt60=0.45, mix=0.18, damp=6000, predelay_ms=4, seed=seed)
    return _finish(y, 0)


def glass_tick(dur=0.45, pitch=1.0, brightness=0.7, seed=1):
    """Crystalline small hit (high inharmonic partials + tick). Sync = onset."""
    rng = _rng(seed, "glass_tick")
    n = _n(dur)
    t = _t(n)
    f0 = 2350 * pitch * (1 + rng.normal(0, 0.01))
    y = np.zeros((n, 2))
    for k, (r, dc, a) in enumerate([(1, 0.28, 1), (2.32, 0.18, 0.7), (4.25, 0.1, 0.5), (6.63, 0.06, 0.35 * brightness)]):
        if f0 * r > 19500:
            continue
        for c in range(2):
            y[:, c] += a * np.sin(TAU * f0 * r * (1 + (c - 0.5) * 0.002) * t + rng.random() * TAU) * env_ad(n, 0.0003, dc)
    tick = hp(rng.standard_normal(n), 4000) * env_ad(n, 0.0001, 0.004)
    y = y / (np.abs(y).max() + 1e-9) + _st(tick) * 0.4
    y = reverb(y, rt60=0.9, mix=0.15, damp=9000, seed=seed)
    return _finish(y, 0)


# ------------------------------ BUILDS ------------------------------------
def _len(beats, seconds, default_beats):
    if seconds is not None and seconds > 0:
        return float(seconds)
    return float(beats if beats is not None else default_beats) * BEAT


def riser(beats=8.0, seconds=None, pitch=1.0, brightness=0.7, noise_amt=0.8, tones=0.5, shepard=0.5,
          stutter=0.0, end="cut", seed=1):
    """Build-up riser: sweeping noise + gliding detuned chord + shepard tones (+ optional tempo stutter).

    beats/seconds  length (seconds wins if given) - the riser ENDS on the cue frame (sync = end)
    pitch          base tuning | brightness 0..1 | noise_amt / tones / shepard 0..1 layer amounts
    stutter        0..1 tempo-synced gating that accelerates 1/8 -> 1/32 notes
    end            'cut' (dead stop at the sync) | 'tail' (short reverb bloom after the sync)
    """
    rng = _rng(seed, "riser")
    T = _len(beats, seconds, 8)
    n = _n(T)
    t = _t(n)
    p = t / T
    a = p ** 2.0
    fc = pitch * 260 * 2 ** (5.2 * p ** 1.2) * (0.6 + 0.6 * brightness)
    y = _air_noise(n, rng, fc, 1.0 + 0.8 * p, corr=0.25, tilt=-0.25, air=0.6 * brightness, air_curve=p ** 3)
    y = y / (np.abs(y).max() + 1e-9) * a[:, None] * noise_amt
    if tones > 0:
        glide = 2 ** (1.0 * p ** 1.6)  # one octave up
        ch = np.zeros((n, 2))
        for nm in (["F2", "C3", "F3", "Ab3"] if pitch == 1.0 else ["F2", "C3", "F3"]):
            ch += supersaw(note_hz(nm) * pitch * glide, n, rng, voices=5, detune=16)
        ch = tvf(ch, "lp", 250 + 9000 * p ** 2 * (0.4 + brightness), 1.1)
        y += ch / (np.abs(ch).max() + 1e-9) * a[:, None] * tones * 0.8
    if shepard > 0:
        K = 8
        base = 40.0 * pitch
        sh = np.zeros(n)
        speed = 2.0 / T  # octaves per second
        for i in range(K):
            oc = (i + speed * t) % K
            fr = base * 2 ** oc
            g = np.exp(-0.5 * ((oc - K / 2) / 1.3) ** 2)
            sh += g * np.sin(TAU * np.cumsum(fr) / SR)
        sh = sh / (np.abs(sh).max() + 1e-9) * (0.25 + 0.75 * p ** 1.5)
        y += pan_mono(sh, 0.3 * np.sin(TAU * 0.4 * t)) * shepard * 0.5
    if stutter > 0:
        rate = (2.0 + 6.0 * p ** 2) / BEAT  # 1/8 -> 1/32 notes
        ph = np.cumsum(rate) / SR % 1.0
        gate = np.clip((0.55 - ph) * 40, 0, 1) * 0.85 + 0.15
        gate = lp(gate, 400)
        y *= (1 - stutter * p + stutter * p * gate)[:, None]
    y = sat(y / (np.abs(y).max() + 1e-9), 1.3)
    if end == "tail":
        y = reverb(y * edges(n, 0, 0.004)[:, None], rt60=1.4, mix=0.35, damp=6000, seed=seed)
        return _finish(y, n - 1, fade_out_ms=80)
    return _finish(y, n - 1, fade_out_ms=4)


def downlifter(dur=2.5, pitch=1.0, brightness=0.6, hit=0.4, seed=1):
    """Falling sweep after a hit: noise band falling 6k->150 Hz, falling tone, decaying. Sync = onset."""
    rng = _rng(seed, "downlifter")
    n = _n(dur)
    t = _t(n)
    p = t / dur
    fc = pitch * 7000 * (0.5 + brightness) * 2 ** (-5.5 * p ** 0.7)
    y = _air_noise(n, rng, fc, 1.2, corr=0.25, tilt=-0.3)
    y = y / (np.abs(y).max() + 1e-9)
    tn = saw(pitch * 900 * 2 ** (-4.0 * p ** 0.8), n, rng.random())
    tn = tvf(tn, "lp", 6000 * 2 ** (-4.5 * p), 1.0)
    y += pan_mono(tn * 0.35, 0.0)
    y *= env_pts(n, [(0, 0), (0.01, 1), (dur * 0.4, 0.45), (dur, 0)], 1.6)[:, None]
    if hit > 0:
        f = 40 * pitch + 80 * pitch * np.exp(-t / 0.04)
        y += _st(sat(sine(f, n) * env_ad(n, 0.001, 0.8), 1.6)) * hit
    y = reverb(y, rt60=1.6, mix=0.25, damp=5000, seed=seed)
    return _finish(sat(y / (np.abs(y).max() + 1e-9), 1.2), 0, fade_out_ms=80)


def _cymbal(n, rng, bright=0.7, t60=1.6):
    t = _t(n)
    freqs = np.array([205.3, 304.4, 369.6, 522.7, 540.0, 800.0]) * (1 + rng.normal(0, 0.01, 6))
    ring = np.zeros(n)
    for f in freqs:
        ring += square(f, n, rng.random())
    nz = rng.standard_normal(n)
    metal = hp(ring * 0.5 + nz * 0.7, 2000 + 2200 * bright)
    metal = filt(metal, "peak", 6500, 0.8, 5 * bright)
    metal = lp(metal, 9000 + 7000 * bright)
    sh = hp(rng.standard_normal(n), 9000) * 0.25 * bright
    return (metal + sh) * env_ad(n, 0.0005, t60)


def reverse_cymbal(dur=2.0, brightness=0.7, seed=1):
    """Reversed crash swelling into the sync point (end). Pair with a hit on the same frame."""
    rng = _rng(seed, "reverse_cymbal")
    n = _n(dur)
    a = _cymbal(n, rng, brightness, t60=dur * 1.15)
    b = _cymbal(n, _rng(seed + 1, "reverse_cymbal"), brightness, t60=dur * 1.15)
    y = np.stack([a, b], 1)[::-1].copy()
    y = widen(y, 0.8)
    y *= edges(n, dur * 0.25, 0.0)[:, None]
    return _finish(sat(y / (np.abs(y).max() + 1e-9), 1.15), n - 1, fade_out_ms=3)


def suck_in(dur=1.2, pitch=1.0, brightness=0.5, seed=1):
    """Reverse swell / inhale that cuts DEAD at the end - for the silence before a drop. Sync = the cut (end)."""
    rng = _rng(seed, "suck_in")
    n = _n(dur)
    p = _t(n) / dur
    rv = _pre_swell(dur, rng, brightness, rt=dur * 1.4)
    fc = pitch * 180 * 2 ** (4.2 * p ** 1.6)
    inh = _air_noise(n, rng, fc, 1.0, corr=0.3, tilt=-0.4) * (p ** 3)[:, None]
    inh /= np.abs(inh).max() + 1e-9
    sub = sine(pitch * (32 + 60 * p ** 2), n) * p ** 3.5
    y = 0.8 * rv + 0.6 * inh + _st(0.7 * sub)
    return _finish(sat(y / (np.abs(y).max() + 1e-9), 1.4), n - 1, fade_out_ms=1.5, fade_in_ms=30)


# ------------------------------ DIGITAL -----------------------------------
def glitch(dur=0.4, intensity=0.7, pitch=1.0, crush_amt=0.6, tonal=0.5, stereo=0.8, seed=1):
    """Digital glitch: buffer-repeat stutters, bitcrush, reverse and pitch slices, hard-panned chaos. Sync = onset.

    intensity 0..1 (slice density / chaos) | crush_amt 0..1 | tonal 0..1 (FM/square vs noise source)
    """
    rng = _rng(seed, "glitch")
    n = _n(dur)
    m = n + _n(0.12)
    # ---- source bank: stepped FM tones, square buzz, noise ----
    src = np.zeros(m)
    pos = 0
    while pos < m:
        L = int(rng.uniform(0.012, 0.045) * SR)
        e = min(m, pos + L)
        k = e - pos
        pr = np.array([0.35 * tonal + 0.1, 0.25 * tonal + 0.1, 0.8 - 0.6 * tonal, 0.2])
        kind = rng.choice(["fm", "sq", "nz", "sweep"], p=pr / pr.sum())
        f = np.exp(rng.uniform(np.log(180), np.log(3200))) * pitch
        if kind == "fm":
            seg = np.sin(TAU * f * _t(k) + rng.uniform(1, 4) * np.sin(TAU * f * rng.choice([0.5, 1.41, 2.0, 3.0]) * _t(k)))
        elif kind == "sq":
            seg = square(f * 0.25, k, rng.random()) * 0.7
        elif kind == "nz":
            seg = bp(rng.standard_normal(k), f * 0.5, min(f * 4, 18000)) * 2.0
        else:
            seg = np.sin(TAU * np.cumsum(np.geomspace(f, f * rng.choice([0.25, 4.0]), k)) / SR)
        src[pos:e] = seg * edges(k, 0.0005, 0.0005)
        pos = e
    # ---- slicer ----
    out = np.zeros((n, 2))
    pos = 0
    sizes = np.array([4, 6, 9, 12, 18, 25, 35, 50]) / 1000.0
    while pos < n:
        sz = sizes[min(len(sizes) - 1, int(rng.integers(0, len(sizes)) * (1.3 - intensity)))]
        L = max(32, int(sz * SR))
        e = min(n, pos + L)
        k = e - pos
        op = rng.choice(["plain", "repeat", "crush", "reverse", "gap", "pitch"],
                        p=np.array([0.2, 0.3, 0.17 * (0.5 + crush_amt), 0.1, 0.15 * (1.2 - intensity), 0.12]) /
                        np.sum([0.2, 0.3, 0.17 * (0.5 + crush_amt), 0.1, 0.15 * (1.2 - intensity), 0.12]))
        p0 = int(rng.integers(0, m - k - 1))
        seg = src[p0:p0 + k].copy()
        if op == "repeat":
            g = max(24, int(rng.choice([1.2, 2, 3, 4.5, 6, 9]) / 1000 * SR))
            micro = src[p0:p0 + g]
            seg = np.tile(micro, k // g + 1)[:k]
        elif op == "crush":
            seg = crush(seg, int(rng.integers(2, 6)), int(rng.integers(3, 24)))
        elif op == "reverse":
            seg = seg[::-1]
        elif op == "gap":
            seg = seg * 0.0
        elif op == "pitch":
            fac = rng.choice([0.5, 0.75, 1.5, 2.0, 3.0])
            idx = np.clip((np.arange(k) * fac).astype(int) + p0, 0, m - 1)
            seg = src[idx]
        seg *= rng.uniform(0.45, 1.0) * edges(k, 0.0004, 0.0004)
        pn = rng.choice([-1.0, -0.5, 0.0, 0.5, 1.0]) * stereo
        out[pos:e] += pan_mono(seg, pn)
        pos = e
    out = hp(out, 70)
    out *= edges(n, 0.001, 0.012)[:, None]
    out = reverb(out, rt60=0.5, mix=0.12, damp=8000, seed=seed)
    return _finish(sat(out / (np.abs(out).max() + 1e-9), 1.6), 0, fade_out_ms=20)


def data_chatter(dur=1.2, density=28.0, pitch=1.0, spread=0.7, bed=0.3, seed=1):
    """Fast random digital blips (computing / data streaming). density = blips per second. Sync = onset."""
    rng = _rng(seed, "data_chatter")
    n = _n(dur)
    y = np.zeros((n, 2))
    k = max(1, int(density * dur))
    times = np.sort(rng.uniform(0, dur - 0.02, k))
    for tt in times:
        L = _n(rng.uniform(0.006, 0.04))
        tl = _t(L)
        if rng.random() < 0.65:
            f = _scale_hz(int(rng.integers(0, 10)), 6) * pitch
        else:
            f = np.exp(rng.uniform(np.log(1200), np.log(7000))) * pitch
        if rng.random() < 0.3:
            f = f * 2 ** (rng.choice([-1, 1]) * np.linspace(0, rng.uniform(0.2, 1.0), L))
        ph = np.cumsum(_full(f, L)) / SR
        w = np.sin(TAU * ph) + (0.25 * np.sign(np.sin(TAU * ph)) if rng.random() < 0.4 else 0)
        g = w * env_ad(L, 0.0008, tl[-1] * 1.4 + 0.004) * rng.uniform(0.3, 1.0)
        i = int(tt * SR)
        y[i:i + L] += pan_mono(g, rng.uniform(-spread, spread))[: n - i]
    if bed > 0:
        b = crush(bp(rng.standard_normal(n), 1500, 6000), 4, 6) * (0.5 + 0.5 * lfo_rand(n, 12, rng, False))
        y += widen(_st(b), 1.0) * 0.12 * bed
    y *= edges(n, 0.01, 0.03)[:, None]
    return _finish(y, 0)


def scan(dur=1.2, pitch=1.0, direction="lr", sweep="up", buzz=0.6, lock=True, seed=1):
    """Laser scan sweep: pitched saw + moving comb (flanged) noise + buzz AM, panning across. Sync = onset.

    sweep 'up'|'down' pitch direction | buzz 0..1 laser 'zzz' | lock adds a 'target locked' chirp at the end
    """
    rng = _rng(seed, "scan")
    n = _n(dur)
    t = _t(n)
    p = t / dur
    pp = p if sweep == "up" else 1 - p
    f = pitch * 320 * 2 ** (2.4 * pp)
    tone = 0.5 * saw(f, n, rng.random()) + 0.5 * sine(f * 2, n)
    tone = tvf(tone, "bp", f * 3, 2.0) * 1.5 + 0.25 * sine(f, n)
    nz = stereo_noise(n, rng, 0.6)
    fcomb = pitch * 240 * 2 ** (2.2 * pp)

    def mask(tf, fr):
        fc = np.interp(tf, t, fcomb)
        c = (0.5 + 0.5 * np.cos(TAU * fr[:, None] / fc[None, :])) ** 6
        return c * (1.0 / (1.0 + (fr[:, None] / 7000.0) ** 2))

    comb = stft_shape(nz, mask, 2048, 256)
    comb /= np.abs(comb).max() + 1e-9
    am = 1 - buzz * 0.7 * (0.5 + 0.5 * np.sign(np.sin(TAU * 86 * t)))
    am = lp(am, 2500)
    env = edges(n, 0.03, 0.12)
    y = (pan_mono(tone * 0.6, 0) + comb * 0.7) * (am * env)[:, None]
    d = _dir(direction)
    y = balance(y, d * 0.85 * (2 * p - 1))
    if lock:
        L = _n(0.25)
        ch = sine(note_hz("C7") * pitch, L) * env_ad(L, 0.001, 0.18) * 0.5
        ch += sine(note_hz("F7") * pitch, L) * env_ad(L, 0.001, 0.12) * 0.3
        y = np.concatenate([y, np.zeros((L, 2))])
        i = n - _n(0.06)
        y[i:i + L] += pan_mono(ch, d * 0.8)
    return _finish(sat(y / (np.abs(y).max() + 1e-9), 1.2), 0)


def zap(dur=0.35, pitch=1.0, direction="none", seed=1):
    """Short energy/laser zap (downward FM chirp + spark). For light tokens, energy bursts, beams. Sync = onset."""
    rng = _rng(seed, "zap")
    n = _n(dur)
    t = _t(n)
    f = pitch * (250 + 3200 * np.exp(-t / 0.045))
    y = np.sin(TAU * np.cumsum(f) / SR + 2.5 * np.exp(-t / 0.05) * np.sin(TAU * np.cumsum(f * 1.5) / SR))
    y = y * env_ad(n, 0.0005, dur * 0.9)
    sp = hp(rng.standard_normal(n), 5000) * env_ad(n, 0.0002, 0.03) * 0.4
    y = y + sp
    d = _dir(direction)
    out = pan_mono(y, d * 0.85 * (2 * np.clip(t / (0.35 * dur), 0, 1) - 1)) if d else er_width(y, 0.6)
    out = reverb(out, rt60=0.8, mix=0.15, damp=8000, seed=seed)
    return _finish(sat(out, 1.2), 0)


def power_up(dur=1.4, pitch=1.0, brightness=0.6, seed=1):
    """Charging whine that accelerates up and lands on a 'ready' ping + thump. Sync = the ping (end of the rise)."""
    rng = _rng(seed, "power_up")
    T = dur
    n = _n(T)
    tail = _n(0.6)
    t = _t(n)
    p = t / T
    f = pitch * 55 * (1500 / 55) ** (p ** 1.7)
    w = 0.6 * sine(f, n) + 0.4 * tvf(saw(f, n, rng.random()), "lp", f * (2 + 4 * brightness), 0.9)
    rate = 7 + 45 * p ** 2
    am = 1 - (0.55 * (1 - p) + 0.1) * (0.5 + 0.5 * np.sin(TAU * np.cumsum(rate) / SR))
    nzb = filt(rng.standard_normal(n), "bp", 3000, 0.7) * p ** 3 * 0.25 * brightness
    rise = (w * am + nzb) * (0.08 + 0.92 * p ** 1.5)
    y = np.zeros((n + tail, 2))
    y[:n] = er_width(rise, 0.5)
    L = tail
    tl = _t(L)
    ping = (np.sin(TAU * note_hz("C7") * pitch * tl + 1.2 * np.exp(-tl / 0.02) * np.sin(TAU * note_hz("C7") * pitch * 2 * tl))
            * env_ad(L, 0.001, 0.45) * 0.6)
    thump = sat(sine(60 * pitch + 90 * pitch * np.exp(-tl / 0.02), L) * env_ad(L, 0.0008, 0.25), 1.5) * 0.7
    click = hp(rng.standard_normal(L), 3000) * env_ad(L, 0.0001, 0.005) * 0.4
    y[n:] += _st(ping + thump + click)
    y[: n] *= edges(n, 0.0, 0.003)[:, None]
    y = reverb(y, rt60=0.9, mix=0.15, damp=7000, seed=seed)
    return _finish(sat(y / (np.abs(y).max() + 1e-9), 1.15), n, fade_out_ms=40)


def power_down(dur=1.4, pitch=1.0, brightness=0.5, seed=1):
    """System shutting down: 'clunk' then a whine winding down with slowing flutter. Sync = onset."""
    rng = _rng(seed, "power_down")
    n = _n(dur)
    t = _t(n)
    p = t / dur
    f = pitch * 1300 * (40 / 1300) ** (p ** 0.6)
    w = 0.6 * sine(f, n) + 0.4 * tvf(saw(f, n, rng.random()), "lp", np.maximum(f * (2 + 3 * brightness), 200), 0.9)
    rate = 40 * (1 - p) ** 2 + 3
    am = 1 - 0.45 * p * (0.5 + 0.5 * np.sin(TAU * np.cumsum(rate) / SR))
    y = w * am * env_pts(n, [(0, 0), (0.01, 1), (dur * 0.5, 0.6), (dur, 0)], 1.3)
    clunk = sat(sine(70 * pitch + 60 * np.exp(-t / 0.015), n) * env_ad(n, 0.0005, 0.2), 1.6) * 0.8
    click = hp(rng.standard_normal(n), 2500) * env_ad(n, 0.0001, 0.006) * 0.5
    out = er_width(y, 0.5) + _st(clunk + click)
    out = reverb(out, rt60=1.0, mix=0.15, damp=6000, seed=seed)
    return _finish(sat(out / (np.abs(out).max() + 1e-9), 1.15), 0, fade_out_ms=60)


def hum_holo(dur=4.0, beats=None, pitch=1.0, movement=0.5, brightness=0.5, seed=1):
    """Holographic hum bed (F drone + beating high partials + electric buzz + air), slow movement.

    dur/beats length (beats wins if given) | movement 0..1 LFO depth | brightness 0..1. Sync = onset.
    """
    rng = _rng(seed, "hum_holo")
    D = float(beats) * BEAT if beats else float(dur)
    n = _n(D)
    t = _t(n)
    f0 = note_hz("F2") * pitch
    y = np.zeros((n, 2))
    for h in range(1, 13):
        a = 1.0 / h ** 1.1 * (1 + movement * 0.6 * lfo_rand(n, 0.6 + 0.15 * h, rng))
        ph0 = rng.random() * TAU
        for c, det in enumerate([-1, 1]):
            fr = f0 * h * (1 + (det * 0.0012 if h > 4 else 0.0))
            y[:, c] += a * np.sin(TAU * fr * t + ph0)
    y = tvf(y, "lp", f0 * (5 + 7 * brightness) * (1 + 0.4 * movement * lfo_rand(n, 0.3, rng)), 1.6)
    hi = np.zeros((n, 2))
    for nm, a in [("C5", 0.5), ("F5", 0.45), ("Ab5", 0.3), ("C6", 0.25), ("G6", 0.12)]:
        fr = note_hz(nm) * pitch
        for c, det in enumerate([-1, 1]):
            trem = 0.6 + 0.4 * np.sin(TAU * (0.2 + rng.random() * 0.6) * t + rng.random() * TAU)
            hi[:, c] += a * trem * np.sin(TAU * fr * (1 + det * 0.0025) * t + rng.random() * TAU)
    buzz = lp(saw(f0 * 0.5 * 2.0, n, 0.0), 2500) * 0.08 * (0.5 + 0.5 * lfo_rand(n, 2, rng))
    air = hp(stereo_noise(n, rng, 0.0, "pink"), 4000) * 0.04 * brightness * (0.6 + 0.4 * lfo_rand(n, 0.5, rng))[:, None]
    y = y / (np.abs(y).max() + 1e-9) + hi / (np.abs(hi).max() + 1e-9) * (0.15 + 0.25 * brightness) + _st(buzz) + air
    y *= edges(n, min(0.6, D * 0.25), min(0.9, D * 0.35))[:, None]
    return _finish(sat(y / (np.abs(y).max() + 1e-9), 1.3), 0, fade_in_ms=5, fade_out_ms=20)


# ------------------------------ UI ----------------------------------------
def blip(note="C6", freq=None, dur=0.14, kind="sine", bend=0.0, width=0.3, seed=1):
    """Pitched UI blip. note 'C6'/'Ab5'/MIDI or freq (Hz); kind 'sine'|'fm'|'square'|'glass';
    bend = semitones glide over the blip (+ up / - down). Sync = onset."""
    rng = _rng(seed, "blip")
    f0 = float(freq) if freq else note_hz(note)
    n = _n(dur)
    t = _t(n)
    f = f0 * 2 ** ((0.4 * np.exp(-t / 0.006) + bend * np.clip(t / (dur * 0.6), 0, 1)) / 12)
    ph = np.cumsum(f) / SR
    if kind == "fm":
        y = np.sin(TAU * ph + 2.5 * np.exp(-t / 0.03) * np.sin(TAU * ph * 2.0))
    elif kind == "square":
        y = lp(square(f, n, 0.0), min(7000, f0 * 6)) * 0.8
    elif kind == "glass":
        y = np.sin(TAU * ph) + 0.4 * np.sin(TAU * ph * 2.76) * np.exp(-t / 0.03) + 0.2 * np.sin(TAU * ph * 5.4) * np.exp(-t / 0.015)
    else:
        y = np.sin(TAU * ph) + 0.12 * np.sin(TAU * ph * 2)
    y = y * env_ad(n, 0.0012, dur)
    y += hp(rng.standard_normal(n), 3000) * env_ad(n, 0.0001, 0.002) * 0.08
    return _finish(er_width(y, width) if width else _st(y), 0, fade_out_ms=5)


def click(brightness=0.6, pitch=1.0, seed=1):
    """Short clean UI click (button press). Sync = onset."""
    rng = _rng(seed, "click")
    n = _n(0.045)
    t = _t(n)
    nz = rng.standard_normal(n)
    ping = filt(nz, "bp", 2800 * pitch * (0.7 + 0.6 * brightness), 6.0) * env_ad(n, 0.0001, 0.012) * 3.0
    edge = hp(nz, 4000) * env_ad(n, 0.0001, 0.0025) * 0.6 * brightness
    tock = np.sin(TAU * 950 * pitch * t) * env_ad(n, 0.0003, 0.012) * 0.5
    y = ping + edge + tock
    return _finish(er_width(y, 0.3), 0, fade_out_ms=4, hp_hz=60)


def tick(pitch=1.0, seed=1):
    """Tiny high tick (hover, step, clock). Sync = onset."""
    rng = _rng(seed, "tick")
    n = _n(0.03)
    t = _t(n)
    y = filt(rng.standard_normal(n), "bp", 6500 * pitch, 5.0) * env_ad(n, 0.0001, 0.008) * 2.0
    y += np.sin(TAU * 4200 * pitch * t) * env_ad(n, 0.0002, 0.012) * 0.4
    return _finish(_st(y), 0, fade_out_ms=3, hp_hz=200)


def _key(rng, L, soft=0.5, space=False):
    tl = _t(L)
    nz = rng.standard_normal(L)
    top = filt(nz, "bp", rng.uniform(2800, 4500) * (0.85 if space else 1), 1.2) * env_ad(L, 0.0001, 0.006) * (1.3 - soft * 0.6)
    f1, f2 = (rng.uniform(220, 300), rng.uniform(520, 700)) if space else (rng.uniform(320, 480), rng.uniform(800, 1200))
    body = (np.sin(TAU * f1 * tl) * env_ad(L, 0.0003, 0.03 if space else 0.018)
            + 0.5 * np.sin(TAU * f2 * tl) * env_ad(L, 0.0003, 0.01)) * 0.6
    bottom = lp(nz, 900) * env_ad(L, 0.0005, 0.02) * 0.4
    return top + body + bottom


def type_keys(n_keys=12, rate=14.0, humanize=0.3, softness=0.4, spread=0.25, seed=1):
    """Fast, clean keyboard typing burst. n_keys keystrokes at ~rate keys/s, humanized timing & tone.
    A 'space' key every ~5 keys. Sync = first keystroke."""
    rng = _rng(seed, "type_keys")
    gaps = (1.0 / rate) * np.clip(1 + humanize * rng.normal(0, 0.45, n_keys), 0.35, 2.2)
    times = np.concatenate([[0.0], np.cumsum(gaps)[:-1]])
    n = _n(times[-1] + 0.25)
    y = np.zeros((n, 2))
    L = _n(0.12)
    for i, tt in enumerate(times):
        space = (i % 5 == 4) and rng.random() < 0.7
        k = _key(rng, L, softness, space) * rng.uniform(0.6, 1.0)
        # key release ~50ms later (quieter)
        rel = _key(rng, L, 0.9) * 0.18
        j = int(tt * SR)
        pn = rng.uniform(-spread, spread)
        y[j:j + L] += pan_mono(k, pn)[: n - j]
        jr = j + int(rng.uniform(0.04, 0.07) * SR)
        if jr < n:
            y[jr:jr + L] += pan_mono(rel, pn)[: n - jr]
    y = reverb(y, rt60=0.35, mix=0.1, damp=7000, seed=seed)
    return _finish(y, 0, hp_hz=90)


def _bell(f, L, t60=0.6, bright=0.5, ratio=2.0):
    tl = _t(L)
    idx = bright * 2.2 * np.exp(-tl / 0.04) + 0.15
    y = np.sin(TAU * f * tl + idx * np.sin(TAU * f * ratio * tl))
    y += 0.18 * np.sin(TAU * f * 4.07 * tl) * np.exp(-tl / 0.05) * bright
    return y * env_ad(L, 0.0015, t60)


def confirm(notes=("Ab5", "C6", "Eb6"), spacing=0.075, decay=0.7, brightness=0.5, echo=0.3, seed=1):
    """Pleasant success chime (2-3 rising bell notes, in key). Sync = first note.
    notes list of note names | spacing s between notes | echo 0..1 1/8-note ping-pong."""
    rng = _rng(seed, "confirm")
    notes = list(notes) if not isinstance(notes, str) else [notes]
    L = _n(decay + 0.05)
    n = _n(spacing * (len(notes) - 1)) + L
    y = np.zeros((n, 2))
    for i, nm in enumerate(notes):
        g = _bell(note_hz(nm), L, decay, brightness) * (0.85 + 0.15 * (i == len(notes) - 1))
        j = int(i * spacing * SR)
        pn = (i - (len(notes) - 1) / 2) * 0.25
        y[j:j + L] += pan_mono(g, pn)
    if echo > 0:
        d = int(BEAT / 2 * SR)
        ext = np.zeros((n + 2 * d, 2))
        ext[:n] += y
        ext[d:d + n, 1] += y[:, 0] * 0.35 * echo
        ext[2 * d:2 * d + n, 0] += y[:, 1] * 0.18 * echo
        y = ext
    y = reverb(y, rt60=1.1, mix=0.15, damp=8000, seed=seed)
    return _finish(y, 0, fade_out_ms=40)


def pop(pitch=1.0, dur=0.14, seed=1):
    """Bubble / message pop ('bloop'): fast upward sine chirp. Sync = onset."""
    rng = _rng(seed, "pop")
    n = _n(dur)
    t = _t(n)
    f = pitch * (280 + 640 * (1 - np.exp(-t / 0.012)))
    y = np.sin(TAU * np.cumsum(f) / SR) * env_ad(n, 0.0015, dur * 0.7)
    y += 0.3 * np.sin(TAU * np.cumsum(f * 2.01) / SR) * env_ad(n, 0.001, dur * 0.3)
    y += hp(rng.standard_normal(n), 2500) * env_ad(n, 0.0001, 0.003) * 0.15
    return _finish(er_width(y, 0.4), 0, fade_out_ms=5)


def counter_roll(dur=0.8, rate=32.0, pitch=1.0, rise=5.0, decel=0.5, land=True, seed=1):
    """Rapid ticking roll (number counter / odometer) that decelerates and lands on a blip.
    rate ticks/s | rise semitones over the roll | decel 0..1 slowdown at the end. Sync = onset."""
    rng = _rng(seed, "counter_roll")
    times = []
    tt = 0.0
    while tt < dur:
        times.append(tt)
        p = tt / dur
        tt += (1.0 / rate) * (1 + decel * 2.5 * p ** 3) * rng.uniform(0.92, 1.08)
    n = _n(dur + 0.4)
    y = np.zeros((n, 2))
    L = _n(0.03)
    tl = _t(L)
    for i, tt in enumerate(times):
        p = tt / dur
        f = 2900 * pitch * 2 ** (rise * p / 12)
        g = np.sin(TAU * f * tl) * env_ad(L, 0.0002, 0.012) + filt(rng.standard_normal(L), "bp", 5500, 3) * env_ad(L, 0.0001, 0.004) * 0.6
        j = int(tt * SR)
        y[j:j + L] += pan_mono(g * rng.uniform(0.6, 0.9), 0.15 * np.sin(i * 1.7))[: n - j]
    if land:
        b = blip(note="C7", freq=None, dur=0.18, kind="glass", seed=seed)
        j = int(min(dur + 0.03, (times[-1] + 0.06)) * SR)
        y[j:j + len(b)] += np.asarray(b)[: n - j] * 0.8
    return _finish(y, 0, fade_out_ms=10)


def toggle(state="on", pitch=1.0, seed=1):
    """Switch toggle: mechanical click + short blip gliding up ('on') or down ('off'). Sync = onset."""
    rng = _rng(seed, "toggle")
    n = _n(0.12)
    t = _t(n)
    c = filt(rng.standard_normal(n), "bp", 3200 * pitch, 4) * env_ad(n, 0.0001, 0.006) * 2
    up = str(state) != "off"
    f = pitch * (1300 + (700 if up else -400) * np.clip(t / 0.04, 0, 1)) if up else pitch * (1700 - 600 * np.clip(t / 0.04, 0, 1))
    b = np.sin(TAU * np.cumsum(f) / SR) * env_ad(n, 0.001, 0.07)
    b = np.concatenate([np.zeros(_n(0.012)), b])[:n]
    return _finish(er_width(c + 0.7 * b, 0.3), 0, fade_out_ms=5)


# ------------------------------ LIGHT -------------------------------------
def shimmer(dur=1.5, brightness=0.7, density=70.0, tonal=0.5, sweep=0.6, seed=1):
    """Sparkly high glitter for flares / light sweeping across glass (random grains + rising sheen). Sync = onset.
    density grains/s | tonal 0..1 grains on F-minor pentatonic vs random | sweep 0..1 sheen sweeping up."""
    rng = _rng(seed, "shimmer")
    n = _n(dur)
    t = _t(n)
    shape = env_pts(n, [(0, 0), (dur * 0.3, 1), (dur * 0.65, 0.7), (dur, 0)], 1.2)
    y = np.zeros((n, 2))
    k = int(density * dur)
    cdf = np.cumsum(shape) / np.sum(shape)
    times = np.interp(rng.random(k), cdf, t)
    for tt in times:
        L = _n(rng.uniform(0.02, 0.12))
        tl = _t(L)
        if rng.random() < tonal:
            f = _scale_hz(int(rng.integers(0, 10)), 7)
        else:
            f = np.exp(rng.uniform(np.log(3500), np.log(13000)))
        f *= (0.85 + 0.3 * brightness)
        if f > 18000:
            f /= 2
        g = np.sin(TAU * f * tl + rng.random() * TAU) * np.sin(np.pi * np.clip(tl / tl[-1], 0, 1)) ** 2 * np.exp(-tl / (L / SR * 0.5))
        i = int(tt * SR)
        y[i:i + L] += pan_mono(g * rng.uniform(0.2, 1.0), rng.uniform(-0.9, 0.9))[: n - i]
    fc = 5000 * 2 ** (1.4 * sweep * t / dur) * (0.8 + 0.4 * brightness)
    sheen = _air_noise(n, rng, fc, 0.6, corr=0.0, tilt=0.0) * shape[:, None]
    y = y / (np.abs(y).max() + 1e-9) + sheen / (np.abs(sheen).max() + 1e-9) * 0.35
    y = reverb(y, rt60=1.5, mix=0.3, damp=9000, seed=seed, lowcut=1500)
    return _finish(y, 0, hp_hz=800, fade_out_ms=60)


def sparkle(dur=0.7, pitch=1.0, count=7, direction="lr", seed=1):
    """Short magic sparkle: fast rising arpeggio of tiny bells (F-minor pentatonic) + dust. Sync = onset."""
    rng = _rng(seed, "sparkle")
    n = _n(dur + 0.6)
    y = np.zeros((n, 2))
    L = _n(0.35)
    d = _dir(direction)
    start = int(rng.integers(0, 3))
    for i in range(int(count)):
        f = _scale_hz(start + i, 6) * pitch
        g = _bell(f, L, 0.25 + 0.05 * rng.random(), 0.6, ratio=3.01) * (0.6 + 0.4 * rng.random())
        j = int((i * dur / max(1, count) * 0.55 + rng.uniform(0, 0.008)) * SR)
        pn = d * (2 * i / max(1, count - 1) - 1) * 0.7 if d else rng.uniform(-0.5, 0.5)
        y[j:j + L] += pan_mono(g, pn)[: n - j]
    dust = shimmer(dur=dur, density=50, tonal=0.2, sweep=0.8, seed=seed)
    y += _pad(dust, n) * 0.35
    y = reverb(y, rt60=1.2, mix=0.2, damp=9000, seed=seed, lowcut=800)
    return _finish(y, 0, hp_hz=300, fade_out_ms=60)


def flare_sting(dur=2.6, pitch=1.0, brightness=0.7, pre=0.18, chord=("F4", "C5", "G5", "Ab5", "C6"), seed=1):
    """Bright tonal sting for lens flares / logo reveals: short reverse swell INTO a shimmering Fm(add9)
    supersaw + bell chord with a flash of noise and a wide tail. Sync = the flash (after ``pre``)."""
    rng = _rng(seed, "flare_sting")
    n = _n(dur)
    t = _t(n)
    pad = np.zeros((n, 2))
    for nm in chord:
        pad += supersaw(note_hz(nm) * pitch, n, rng, voices=7, detune=20)
    cutoff = 800 + 9000 * (0.4 + brightness) * np.exp(-t / 0.35) + 1500
    pad = tvf(pad, "lp", cutoff, 1.0)
    pad = pad / (np.abs(pad).max() + 1e-9) * env_ad(n, 0.004, dur * 0.9)[:, None]
    bells = np.zeros(n)
    for nm in chord[-3:]:
        bells += _bell(note_hz(nm) * 2 * pitch, n, 1.4, 0.7, ratio=3.5)
    bells = er_width(bells / (np.abs(bells).max() + 1e-9), 0.8)
    flash = hp(stereo_noise(n, rng, 0.2), 3000) * env_ad(n, 0.0005, 0.25)[:, None]
    sh = _pad(shimmer(dur=min(dur, 1.6), brightness=brightness, density=60, seed=seed), n)
    y = 0.75 * pad + 0.45 * bells + 0.35 * flash * brightness + 0.4 * sh
    y = reverb(y, rt60=2.2, mix=0.35, damp=7000, seed=seed, width=1.2)
    sync = 0
    if pre > 0:
        sw = _pre_swell(pre, rng, 0.8, rt=0.5) * 0.35
        y = np.concatenate([sw, y])
        sync = len(sw)
    return _finish(sat(y / (np.abs(y).max() + 1e-9), 1.2), sync, fade_out_ms=80)


# ------------------------------ LOW PULSES --------------------------------
def pulse(dur=0.6, pitch=1.0, drive=1.6, seed=1):
    """Single low pulse (soft sub thump ~55 Hz with audible harmonics). Sync = onset."""
    n = _n(dur)
    t = _t(n)
    f = pitch * (55 + 25 * np.exp(-t / 0.03))
    y = sine(f, n) * env_ad(n, 0.006, dur * 0.8)
    y = sat(y, drive)
    y += 0.5 * sine(f * 2.5, n) * env_ad(n, 0.003, 0.1)
    y += 0.25 * lp(sat(y, 4.0) - y, 900)
    y = lp(y, 900)
    return _finish(_st(y), 0, hp_hz=18)


def heartbeat_sub(count=2, gap=0.24, pitch=1.0, seed=1):
    """Low 'lub-dub' heartbeat pulse (count thumps, second softer). Sync = first thump."""
    rng = _rng(seed, "heartbeat_sub")
    L = _n(0.5)
    tl = _t(L)
    n = _n(gap * (count - 1)) + L
    y = np.zeros(n)
    for i in range(int(count)):
        f = pitch * (44 + 36 * np.exp(-tl / 0.03))
        th = sat(np.sin(TAU * np.cumsum(f) / SR) * env_ad(L, 0.004, 0.35), 2.2)
        th += lp(rng.standard_normal(L), 400) * env_ad(L, 0.002, 0.05) * 0.5
        th += 0.3 * np.sin(TAU * np.cumsum(f * 2.5) / SR) * env_ad(L, 0.002, 0.08)
        j = int(i * gap * SR)
        y[j:j + L] += th * (1.0 if i % 2 == 0 else 0.62)
    return _finish(_st(lp(y, 900)), 0, hp_hz=18)


# ==========================================================================
# Registry / metadata (used by mix.py and CATALOG.md)
#   sync: where the cue frame lands   send: default reverb send   duck: music duck dB
# ==========================================================================
REGISTRY = {}
META = {}


def _reg(fn, cat, sync, send, gain, duck=0.0):
    REGISTRY[fn.__name__] = fn
    META[fn.__name__] = dict(category=cat, sync=sync, send=send, gain=gain, duck=duck)


for _fn, _c, _s, _snd, _g, _d in [
    (whoosh, "motion", "peak", 0.15, -9, 0), (whip, "motion", "peak", 0.10, -9, 0),
    (fly_by, "motion", "peak", 0.12, -8, 0), (swoosh_rev, "motion", "end", 0.10, -9, 0),
    (shockwave, "motion", "onset", 0.08, -7, 1.5),
    (impact, "impact", "onset", 0.06, -5, 2.5), (boom, "impact", "onset", 0.04, -3, 3.5),
    (sub_drop, "impact", "onset", 0.0, -10, 1.5), (hit_metal, "impact", "onset", 0.12, -10, 0),
    (stamp, "impact", "onset", 0.10, -7, 0.8), (glass_tick, "impact", "onset", 0.15, -14, 0),
    (riser, "build", "end", 0.10, -9, 0), (downlifter, "build", "onset", 0.12, -12, 0),
    (reverse_cymbal, "build", "end", 0.10, -11, 0), (suck_in, "build", "end", 0.0, -8, 0),
    (glitch, "digital", "onset", 0.08, -11, 0), (data_chatter, "digital", "onset", 0.12, -16, 0),
    (scan, "digital", "onset", 0.15, -14, 0), (zap, "digital", "onset", 0.15, -12, 0),
    (power_up, "digital", "end", 0.12, -12, 0), (power_down, "digital", "onset", 0.12, -12, 0),
    (hum_holo, "digital", "onset", 0.10, -20, 0),
    (blip, "ui", "onset", 0.18, -16, 0), (click, "ui", "onset", 0.10, -17, 0), (tick, "ui", "onset", 0.10, -19, 0),
    (type_keys, "ui", "onset", 0.08, -13, 0), (confirm, "ui", "onset", 0.18, -14, 0),
    (pop, "ui", "onset", 0.15, -15, 0), (counter_roll, "ui", "onset", 0.12, -16, 0),
    (toggle, "ui", "onset", 0.10, -16, 0),
    (shimmer, "light", "onset", 0.15, -14, 0), (flare_sting, "light", "onset", 0.12, -8, 0),
    (sparkle, "light", "onset", 0.18, -13, 0),
    (pulse, "low", "onset", 0.0, -9, 0), (heartbeat_sub, "low", "onset", 0.0, -14, 0),
]:
    _reg(_fn, _c, _s, _snd, _g, _d)


def params_of(name):
    """{param: default} for a registered sound."""
    sig = inspect.signature(REGISTRY[name])
    return {k: v.default for k, v in sig.parameters.items()}


def render(name, params=None):
    """Synthesize ``name`` with a params dict, validating names. Returns Sound."""
    if name not in REGISTRY:
        raise KeyError(f"unknown sfx {name!r}")
    params = dict(params or {})
    allowed = params_of(name)
    bad = [k for k in params if k not in allowed]
    if bad:
        raise TypeError(f"{name}: unknown param(s) {bad}; allowed: {sorted(allowed)}")
    return REGISTRY[name](**params)


def _cli(argv):
    if len(argv) < 2 or argv[1] in ("-h", "--help"):
        print(__doc__)
        return
    if argv[1] == "list":
        for k in REGISTRY:
            print(f"{k:15s} sync={META[k]['sync']:5s} gain={META[k]['gain']:>4} {params_of(k)}")
        return
    if argv[1] == "render":
        import os
        name = argv[2]
        params = json.loads(argv[3]) if len(argv) > 3 else {}
        y = render(name, params)
        d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build", "audition")
        os.makedirs(d, exist_ok=True)
        from scipy.io import wavfile
        p = os.path.join(d, f"{name}.wav")
        wavfile.write(p, SR, (np.asarray(y) * 32767).astype(np.int16))
        print(f"{p}  {len(y) / SR:.2f}s  sync={y.sync / SR:.3f}s")
        return
    print("usage: lib.py list | render <name> [json-params]")


if __name__ == "__main__":
    _cli(sys.argv)
