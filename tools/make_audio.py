"""Procedural royalty-free loops for SOMPO TEAM.

Renders five seamless-looping tracks with a tiny additive/subtractive synth and
encodes them to mp3. Reverb tails are wrapped back to the head so each file
loops without a seam.
"""

import os
import subprocess

import numpy as np
from scipy import signal

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "public", "audio")
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")

NOTES = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6,
         "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def hz(name):
    pitch = name[:-1]
    octave = int(name[-1])
    midi = 12 * (octave + 1) + NOTES[pitch]
    return 440.0 * 2 ** ((midi - 69) / 12)


def env(n, attack, decay, sustain, release):
    a, d, r = int(attack * SR), int(decay * SR), int(release * SR)
    s = max(0, n - a - d - r)
    return np.concatenate([
        np.linspace(0, 1, a, endpoint=False) if a else np.array([]),
        np.linspace(1, sustain, d, endpoint=False) if d else np.array([]),
        np.full(s, sustain),
        np.linspace(sustain, 0, r) if r else np.array([]),
    ])[:n]


def osc(freq, n, kind="sine", detune=0.0, phase=0.0):
    t = np.arange(n) / SR
    f = freq * (1 + detune)
    ph = 2 * np.pi * f * t + phase

    if kind == "sine":
        return np.sin(ph)
    if kind == "tri":
        return signal.sawtooth(ph, 0.5)
    if kind == "saw":
        return signal.sawtooth(ph)
    if kind == "square":
        return signal.square(ph, 0.45)
    if kind == "ep":
        # electric-piano-ish: fundamental + bell partials that decay faster
        body = np.sin(ph)
        bell = 0.34 * np.sin(2 * ph) + 0.16 * np.sin(3 * ph) + 0.07 * np.sin(5.1 * ph)
        tine = np.exp(-np.arange(n) / (SR * 0.16))
        return body + bell * tine
    if kind == "piano":
        out = np.zeros(n)
        for k, amp in enumerate([1.0, 0.42, 0.24, 0.12, 0.07, 0.04], start=1):
            out += amp * np.sin(k * ph) * np.exp(-np.arange(n) / (SR * (0.9 / k)))
        return out
    raise ValueError(kind)


def lowpass(x, cutoff, q=0.7):
    b, a = signal.butter(2, min(cutoff / (SR / 2), 0.99), btype="low")
    return signal.lfilter(b, a, x)


def highpass(x, cutoff):
    b, a = signal.butter(2, min(cutoff / (SR / 2), 0.99), btype="high")
    return signal.lfilter(b, a, x)


def bandpass(x, low, high):
    b, a = signal.butter(2, [low / (SR / 2), min(high / (SR / 2), 0.99)], btype="band")
    return signal.lfilter(b, a, x)


def reverb(x, size=0.65, mix=0.3):
    delays = [1237, 1381, 1607, 1789]
    gains = [0.78, 0.74, 0.7, 0.66]
    wet = np.zeros(len(x) + SR)
    padded = np.concatenate([x, np.zeros(SR)])

    for d, g in zip(delays, gains):
        buf = np.zeros(len(padded))
        buf[d:] = padded[:-d]
        decayed = signal.lfilter([1.0], [1.0, -g * size], buf)
        wet += decayed / len(delays)

    wet = lowpass(wet, 6500)
    out = padded * (1 - mix) + wet * mix
    return out


def fold_tail(x, length):
    """Wrap a reverb tail back onto the head so the loop is seamless."""
    head = x[:length].copy()
    tail = x[length:]
    if len(tail):
        n = min(len(tail), length)
        head[:n] += tail[:n]
    return head


def place(buf, sample, at):
    start = int(at * SR)
    end = min(len(buf), start + len(sample))
    if start >= len(buf):
        return
    buf[start:end] += sample[:end - start]


def note(buf, freq, at, dur, amp=0.2, kind="sine", adsr=(0.01, 0.08, 0.6, 0.25), detune=0.0):
    n = int(dur * SR)
    sig = osc(freq, n, kind, detune=detune) * env(n, *adsr) * amp
    place(buf, sig, at)


def chord(buf, names, at, dur, amp=0.12, kind="ep", adsr=(0.012, 0.25, 0.45, 0.9), spread=0.004):
    for i, nm in enumerate(names):
        note(buf, hz(nm), at + i * 0.012, dur, amp, kind, adsr, detune=spread * (i - 1))


def kick(buf, at, amp=0.85, punch=1.0):
    n = int(0.34 * SR)
    t = np.arange(n) / SR
    sweep = 118 * np.exp(-t * 34) + 46
    body = np.sin(2 * np.pi * np.cumsum(sweep) / SR) * np.exp(-t * 9.5)
    click = np.random.default_rng(1).normal(0, 1, n) * np.exp(-t * 420) * 0.25
    place(buf, (body + click) * amp * punch, at)


def snare(buf, at, amp=0.34, rng=None):
    rng = rng or np.random.default_rng(7)
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    noise = bandpass(rng.normal(0, 1, n), 900, 7200) * np.exp(-t * 17)
    tone = (np.sin(2 * np.pi * 188 * t) + 0.6 * np.sin(2 * np.pi * 331 * t)) * np.exp(-t * 26)
    place(buf, (noise * 0.85 + tone * 0.35) * amp, at)


def hat(buf, at, amp=0.16, open_=False, rng=None):
    rng = rng or np.random.default_rng(11)
    dur = 0.24 if open_ else 0.06
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = highpass(rng.normal(0, 1, n), 7800) * np.exp(-t * (14 if open_ else 62))
    place(buf, sig * amp, at)


def vinyl(n, amount=0.02, seed=3):
    rng = np.random.default_rng(seed)
    hiss = highpass(rng.normal(0, 1, n), 2600) * 0.35
    crackle = np.zeros(n)
    hits = rng.integers(0, n, size=int(n / SR * 34))
    crackle[hits] = rng.normal(0, 1, len(hits))
    crackle = bandpass(crackle, 1600, 9000) * 3.2
    return (hiss + crackle) * amount


def stereo(x, width=0.012):
    delay = int(width * SR)
    left = x.copy()
    right = np.concatenate([np.zeros(delay), x[:-delay]]) if delay else x.copy()
    right = lowpass(right, 15000)
    return np.stack([left, right], axis=1)


def master(x, target=0.82):
    x = x - np.mean(x)
    x = np.tanh(x * 1.15)
    peak = np.max(np.abs(x)) or 1.0
    return x * (target / peak)


def write_mp3(name, stereo_sig, bitrate="112k"):
    raw = (np.clip(stereo_sig, -1, 1) * 32767).astype("<i2").tobytes()
    path = os.path.join(OUT, name)
    cmd = [
        FFMPEG, "-y", "-loglevel", "error",
        "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "pipe:0",
        "-codec:a", "libmp3lame", "-b:a", bitrate, path,
    ]
    subprocess.run(cmd, input=raw, check=True)
    return path, os.path.getsize(path)


# ─────────────────────────────────────────────────────────────── tracks

def sunset_lover():
    """78 BPM lofi: Rhodes-ish chords, sub bass, brushed drums, vinyl."""
    bpm, bars = 78, 16
    beat = 60 / bpm
    bar = beat * 4
    total = bar * bars
    n = int((total + 2.2) * SR)
    buf = np.zeros(n)
    rng = np.random.default_rng(21)

    progression = [
        (["F3", "A3", "C4", "E4"], "F2"),
        (["D3", "F3", "A3", "C4"], "D2"),
        (["A#2", "D3", "F3", "A3"], "A#1"),
        (["C3", "E3", "G3", "A#3"], "C2"),
    ]

    for b in range(bars):
        at = b * bar
        names, bass = progression[b % 4]
        chord(buf, names, at + 0.02, bar * 0.95, amp=0.1, kind="ep")
        chord(buf, names, at + beat * 2.5, bar * 0.4, amp=0.05, kind="ep")

        note(buf, hz(bass), at, beat * 1.9, 0.3, "sine", (0.01, 0.3, 0.55, 0.4))
        note(buf, hz(bass), at + beat * 2.5, beat * 1.2, 0.22, "sine", (0.01, 0.25, 0.5, 0.35))

        kick(buf, at, 0.8)
        kick(buf, at + beat * 2.5, 0.62)
        snare(buf, at + beat, 0.3, rng)
        snare(buf, at + beat * 3, 0.32, rng)

        for i in range(8):
            swing = 0.055 if i % 2 else 0.0
            hat(buf, at + i * beat / 2 + swing, 0.09 + 0.03 * (i % 2 == 0),
                open_=(i == 7), rng=rng)

        if b % 4 == 3:
            for i, deg in enumerate(["A4", "C5", "E5"]):
                note(buf, hz(deg), at + beat * 3 + i * 0.14, 0.5, 0.07, "ep",
                     (0.005, 0.1, 0.3, 0.4))

    buf = lowpass(buf, 9200)
    buf = reverb(buf, size=0.6, mix=0.26)
    buf = fold_tail(buf, int(total * SR))
    buf += vinyl(len(buf), 0.022)
    return master(buf), total


def neon_alley():
    """104 BPM synthwave: saw arp, driving bass, gated pad."""
    bpm, bars = 104, 16
    beat = 60 / bpm
    bar = beat * 4
    total = bar * bars
    n = int((total + 2.2) * SR)
    buf = np.zeros(n)
    rng = np.random.default_rng(33)

    progression = [
        (["A2", "C3", "E3", "G3"], "A1", ["A3", "C4", "E4", "G4"]),
        (["F2", "A2", "C3", "E3"], "F1", ["F3", "A3", "C4", "E4"]),
        (["C3", "E3", "G3", "B3"], "C2", ["C4", "E4", "G4", "B4"]),
        (["G2", "B2", "D3", "F3"], "G1", ["G3", "B3", "D4", "F4"]),
    ]

    for b in range(bars):
        at = b * bar
        pad, bass, arp = progression[b % 4]

        for nm in pad:
            note(buf, hz(nm), at, bar * 0.92, 0.045, "saw", (0.18, 0.4, 0.5, 0.5), 0.006)

        for i in range(8):
            note(buf, hz(bass), at + i * beat / 2, beat * 0.4, 0.24, "square",
                 (0.004, 0.06, 0.5, 0.1))

        for i in range(16):
            nm = arp[i % 4] if (b % 2 == 0) else arp[(i * 3) % 4]
            note(buf, hz(nm), at + i * beat / 4, beat * 0.3, 0.075, "saw",
                 (0.004, 0.05, 0.35, 0.12), 0.004)

        for i in range(4):
            kick(buf, at + i * beat, 0.86)
        snare(buf, at + beat, 0.36, rng)
        snare(buf, at + beat * 3, 0.36, rng)
        for i in range(8):
            hat(buf, at + i * beat / 2 + beat / 4, 0.1, open_=(i % 4 == 3), rng=rng)

    buf = lowpass(buf, 11500)
    buf = reverb(buf, size=0.55, mix=0.22)
    buf = fold_tail(buf, int(total * SR))
    return master(buf), total


def paper_planes():
    """84 BPM focus loop: piano arpeggio over a slow pad, no drums."""
    bpm, bars = 84, 16
    beat = 60 / bpm
    bar = beat * 4
    total = bar * bars
    n = int((total + 3.0) * SR)
    buf = np.zeros(n)

    progression = [
        (["C4", "E4", "G4", "B4"], ["C3", "G3"]),
        (["A3", "C4", "E4", "G4"], ["A2", "E3"]),
        (["F3", "A3", "C4", "E4"], ["F2", "C3"]),
        (["G3", "B3", "D4", "F4"], ["G2", "D3"]),
    ]

    for b in range(bars):
        at = b * bar
        arp, pad = progression[b % 4]

        for nm in pad:
            note(buf, hz(nm), at, bar * 0.98, 0.05, "tri", (0.6, 0.6, 0.55, 0.9), 0.005)

        pattern = [0, 1, 2, 3, 2, 1, 2, 3]
        for i, step in enumerate(pattern):
            amp = 0.13 if i % 4 == 0 else 0.09
            note(buf, hz(arp[step]), at + i * beat / 2, beat * 1.1, amp, "piano",
                 (0.004, 0.5, 0.25, 0.5))

        if b % 4 == 2:
            note(buf, hz(arp[3]) * 2, at + beat * 3, beat, 0.06, "piano",
                 (0.004, 0.4, 0.2, 0.5))

    buf = lowpass(buf, 8200)
    buf = reverb(buf, size=0.78, mix=0.38)
    buf = fold_tail(buf, int(total * SR))
    buf += vinyl(len(buf), 0.008, seed=9)
    return master(buf, 0.74), total


def crowd_surf():
    """122 BPM house: four-on-floor, offbeat bass, stab chords."""
    bpm, bars = 122, 16
    beat = 60 / bpm
    bar = beat * 4
    total = bar * bars
    n = int((total + 2.0) * SR)
    buf = np.zeros(n)
    rng = np.random.default_rng(51)

    progression = [
        (["D4", "F4", "A4"], "D2"),
        (["C4", "E4", "G4"], "C2"),
        (["A#3", "D4", "F4"], "A#1"),
        (["A3", "C4", "E4"], "A1"),
    ]

    for b in range(bars):
        at = b * bar
        stab, bass = progression[b % 4]

        for i in range(4):
            kick(buf, at + i * beat, 0.9)
            hat(buf, at + i * beat + beat / 2, 0.13, open_=True, rng=rng)
            hat(buf, at + i * beat + beat / 4, 0.07, rng=rng)

        snare(buf, at + beat, 0.24, rng)
        snare(buf, at + beat * 3, 0.26, rng)

        for i in range(8):
            if i % 2 == 1:
                note(buf, hz(bass), at + i * beat / 2, beat * 0.34, 0.26, "square",
                     (0.004, 0.05, 0.45, 0.1))

        for offset in (0.5, 1.5, 2.75, 3.5):
            for nm in stab:
                note(buf, hz(nm), at + offset * beat, beat * 0.28, 0.06, "saw",
                     (0.006, 0.08, 0.25, 0.12), 0.005)

        if b % 8 == 7:
            sweep_n = int(bar * SR)
            t = np.arange(sweep_n) / SR
            riser = highpass(rng.normal(0, 1, sweep_n), 2000) * (t / t[-1]) ** 3 * 0.16
            place(buf, riser, at)

    buf = lowpass(buf, 12500)
    buf = reverb(buf, size=0.5, mix=0.2)
    buf = fold_tail(buf, int(total * SR))
    return master(buf), total


def three_am_rain():
    """Beatless ambient: drifting pad, rain, distant sub swell."""
    total = 48.0
    n = int((total + 3.0) * SR)
    buf = np.zeros(n)
    rng = np.random.default_rng(77)

    layers = [
        (["D3", "A3", "D4", "F4"], 0.0, 16.0),
        (["C3", "G3", "C4", "E4"], 12.0, 16.0),
        (["A#2", "F3", "A#3", "D4"], 24.0, 16.0),
        (["A2", "E3", "A3", "C4"], 36.0, 14.0),
    ]
    for names, at, dur in layers:
        for i, nm in enumerate(names):
            note(buf, hz(nm), at + i * 0.35, dur, 0.085, "tri",
                 (2.4, 3.0, 0.6, 4.0), detune=0.004 * (i - 1.5))

    rain = highpass(rng.normal(0, 1, n), 1400)
    rain *= 0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * np.arange(n) / SR)
    buf += rain * 0.05

    drops = np.zeros(n)
    hits = rng.integers(0, n, size=int(total * 12))
    drops[hits] = rng.normal(0, 1, len(hits))
    buf += bandpass(drops, 2200, 8000) * 1.25

    for at in (4.0, 20.0, 34.0):
        note(buf, hz("D1"), at, 8.0, 0.15, "sine", (2.0, 2.0, 0.6, 3.5))

    buf = lowpass(buf, 7200)
    buf = reverb(buf, size=0.86, mix=0.44)
    buf = fold_tail(buf, int(total * SR))
    return master(buf, 0.86), total


TRACKS = [
    ("sunset-lover.mp3", sunset_lover),
    ("neon-alley.mp3", neon_alley),
    ("paper-planes.mp3", paper_planes),
    ("crowd-surf.mp3", crowd_surf),
    ("3am-rain.mp3", three_am_rain),
]

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for filename, render in TRACKS:
        mono, seconds = render()
        path, size = write_mp3(filename, stereo(mono))
        print(f"{filename:18} {seconds:6.1f}s  {size / 1024:7.0f} KB")
