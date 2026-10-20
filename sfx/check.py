"""
Analytic QA for sfx/lib.py (you cannot listen, so measure).

    python3 sfx/check.py                 # metrics table for every sound at default params
    python3 sfx/check.py --png           # + spectrogram contact sheets in sfx/build/spec/
    python3 sfx/check.py whoosh impact   # only these (also renders each to sfx/build/audition/)

Checks: finite, peak, RMS, crest, spectral centroid, band balance, DC, start/end
sample, tail level (decays to silence), max momentary loudness (K-weighted, 400 ms),
stereo correlation, synthesis time.
"""
import os
import sys
import time

import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")

# A few extra variants worth checking besides defaults
VARIANTS = {
    "whoosh_long_rl": ("whoosh", {"dur": 1.6, "direction": "rl", "pitch": 0.7}),
    "riser_4b_stutter": ("riser", {"beats": 4, "stutter": 0.8}),
    "riser_tail": ("riser", {"beats": 6, "end": "tail"}),
    "impact_pre": ("impact", {"pre": 0.6}),
    "boom_pre": ("boom", {"pre": 0.8}),
    "hit_glass": ("hit_metal", {"material": "glass"}),
    "blip_fm": ("blip", {"note": "F6", "kind": "fm"}),
    "toggle_off": ("toggle", {"state": "off"}),
    "hum_8b": ("hum_holo", {"beats": 8}),
}


def kweight(x):
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    return signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=0), axis=0)


def momentary_max(x):
    z = kweight(x) ** 2
    w = int(0.4 * lib.SR)
    if len(z) <= w:
        z = np.concatenate([z, np.zeros((w + 1 - len(z), 2))])
    c = np.cumsum(np.sum(z, 1))
    ms = (c[w:] - c[:-w]) / w
    return -0.691 + 10 * np.log10(ms.max() + 1e-12)


def metrics(y):
    x = np.asarray(y)
    sr = lib.SR
    pk = np.abs(x).max()
    m = x.mean(1)
    rms = np.sqrt(np.mean(x ** 2))
    f, P = signal.welch(m, sr, nperseg=min(4096, len(m)))
    cen = float((f * P).sum() / (P.sum() + 1e-20))
    bands = []
    for lo, hi in [(0, 80), (80, 300), (300, 2000), (2000, 8000), (8000, 24000)]:
        sel = (f >= lo) & (f < hi)
        bands.append(P[sel].sum())
    bands = np.array(bands) / (sum(bands) + 1e-20) * 100
    tail_n = int(0.03 * sr) if len(x) > 0.3 * sr else max(8, len(x) // 10)
    tail = 20 * np.log10(np.sqrt(np.mean(x[-tail_n:] ** 2)) / (pk + 1e-12) + 1e-12)
    dc = 20 * np.log10(abs(x.mean()) / (pk + 1e-12) + 1e-12)
    corr = float(np.corrcoef(x[:, 0], x[:, 1])[0, 1]) if np.std(x[:, 0]) > 0 and np.std(x[:, 1]) > 0 else 1.0
    return dict(
        dur=len(x) / sr, sync=y.sync / sr, finite=bool(np.isfinite(x).all()), peak=20 * np.log10(pk + 1e-12),
        rms=20 * np.log10(rms + 1e-12), crest=20 * np.log10(pk / (rms + 1e-12)), cen=cen, bands=bands, dc=dc,
        first=abs(x[0]).max(), last=abs(x[-1]).max(), tail=tail, mlufs=momentary_max(x), corr=corr,
    )


def spec_png(items, path, cols=4):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    rows = int(np.ceil(len(items) / cols))
    fig, axs = plt.subplots(rows, cols, figsize=(cols * 4.6, rows * 2.9), squeeze=False)
    for ax in axs.flat:
        ax.axis("off")
    for ax, (name, y) in zip(axs.flat, items):
        ax.axis("on")
        m = np.asarray(y).mean(1)
        nper = 1024
        f, t, S = signal.spectrogram(m, lib.SR, nperseg=nper, noverlap=nper - 256, scaling="spectrum")
        S = 10 * np.log10(S + 1e-14)
        S -= S.max()
        ax.pcolormesh(t, f, S, vmin=-90, vmax=0, shading="auto", cmap="magma")
        ax.set_yscale("log")
        ax.set_ylim(30, 24000)
        env = np.abs(np.asarray(y)).max(1)
        k = max(1, len(env) // 400)
        e = env[: len(env) // k * k].reshape(-1, k).max(1)
        te = np.arange(len(e)) * k / lib.SR
        ax2 = ax.twinx()
        ax2.plot(te, np.asarray(y)[: len(e) * k: k, 0] * 0 + e, color="cyan", lw=0.8)
        ax2.plot(te, np.abs(np.asarray(y)[: len(e) * k].reshape(-1, k, 2)[:, :, 0]).max(1) - np.abs(np.asarray(y)[: len(e) * k].reshape(-1, k, 2)[:, :, 1]).max(1), color="lime", lw=0.5)
        ax2.set_ylim(-1, 1.05)
        ax2.set_yticks([])
        ax.axvline(y.sync / lib.SR, color="white", ls="--", lw=0.8)
        ax.set_title(name, fontsize=9)
        ax.tick_params(labelsize=6)
    fig.tight_layout()
    fig.savefig(path, dpi=70)
    plt.close(fig)


def main(argv):
    png = "--png" in argv
    names = [a for a in argv[1:] if not a.startswith("--")]
    todo = []
    if names:
        for nm in names:
            todo.append((nm, VARIANTS[nm] if nm in VARIANTS else (nm, {})))
    else:
        todo = [(k, (k, {})) for k in lib.REGISTRY] + list(VARIANTS.items())
    rendered = []
    print(f"{'name':18s} {'dur':>5s} {'sync':>5s} {'pk':>5s} {'rms':>6s} {'crest':>5s} {'cent':>6s} "
          f"{'sub/low/mid/hi/air %':>22s} {'dc':>5s} {'tail':>6s} {'Mmax':>6s} {'corr':>5s} {'ms':>5s}  flags")
    bad = 0
    for label, (nm, params) in todo:
        t0 = time.time()
        y = lib.render(nm, params)
        dt = (time.time() - t0) * 1000
        r = metrics(y)
        flags = []
        if not r["finite"]:
            flags.append("NAN")
        if r["dc"] > -50:
            flags.append("DC")
        if r["first"] > 0.02:
            flags.append("START")
        if r["last"] > 0.002:
            flags.append("END")
        if lib.META[nm]["sync"] != "end" and r["tail"] > -45:
            flags.append("TAIL")
        if dt > 1500:
            flags.append("SLOW")
        bad += bool(flags)
        b = "/".join(f"{v:.0f}" for v in r["bands"])
        print(f"{label:18s} {r['dur']:5.2f} {r['sync']:5.2f} {r['peak']:5.1f} {r['rms']:6.1f} {r['crest']:5.1f} {r['cen']:6.0f} "
              f"{b:>22s} {r['dc']:5.0f} {r['tail']:6.1f} {r['mlufs']:6.1f} {r['corr']:5.2f} {dt:5.0f}  {' '.join(flags)}")
        rendered.append((label, y))
        if names:
            from scipy.io import wavfile
            d = os.path.join(BUILD, "audition")
            os.makedirs(d, exist_ok=True)
            wavfile.write(os.path.join(d, f"{label}.wav"), lib.SR, (np.asarray(y) * 32767).astype(np.int16))
    print(f"\n{len(todo)} sounds, {bad} flagged")
    if png:
        d = os.path.join(BUILD, "spec")
        os.makedirs(d, exist_ok=True)
        for i in range(0, len(rendered), 12):
            p = os.path.join(d, f"sheet{i // 12 + 1}.png")
            spec_png(rendered[i:i + 12], p)
            print("wrote", p)


if __name__ == "__main__":
    main(sys.argv)
