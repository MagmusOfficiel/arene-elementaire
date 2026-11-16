"""Boucle de musique de combat (style shōnen) synthétisée -> client/public/audio/combat.ogg"""
import numpy as np, subprocess, sys, os, wave

SR = 44100; BPM = 140; BEAT = 60 / BPM; BARS = 16
N = int(SR * BEAT * 4 * BARS)
mix = np.zeros((N, 2), np.float32)
rng = np.random.default_rng(3)

def add(sig, start, pan=0.0, vol=1.0):
    s = int(start * SR); e = min(N, s + len(sig))
    if e <= s: return
    sig = sig[:e - s] * vol
    mix[s:e, 0] += sig * (1 - max(0, pan)); mix[s:e, 1] += sig * (1 + min(0, pan))

def t_(dur): return np.arange(int(dur * SR)) / SR
def envexp(dur, k): return np.exp(-t_(dur) * k)
def note(m): return 440 * 2 ** ((m - 69) / 12)

def kick():
    t = t_(0.35); f = 50 + 120 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * envexp(0.35, 9)
def snare():
    t = t_(0.25); return (rng.standard_normal(len(t)) * 0.6 + np.sin(2 * np.pi * 190 * t) * 0.5) * envexp(0.25, 16)
def hat(open_=False):
    d = 0.18 if open_ else 0.05; n = rng.standard_normal(int(d * SR)); n = np.diff(n, prepend=0)
    return n * envexp(d, 18 if open_ else 70) * 0.35
def saw(f, dur, k=3):
    t = t_(dur); s = 2 * ((t * f) % 1) - 1
    s2 = 2 * ((t * f * 1.006) % 1) - 1
    return (s + s2) * 0.5 * envexp(dur, k)
def lowpass(x, a=0.15):
    y = np.zeros_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
def pluck(f, dur):
    t = t_(dur); return (np.sign(np.sin(2 * np.pi * f * t)) * 0.4 + np.sin(2 * np.pi * f * 2 * t) * 0.3) * envexp(dur, 9)
def pad(freqs, dur):
    t = t_(dur); s = sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * 0.3 * t)) for f in freqs) / len(freqs)
    a = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.4)
    return s * a

# Progression en ré mineur : Dm - Bb - F - C (puis variante C - A)
prog = [(50, [62, 65, 69]), (46, [58, 62, 65]), (53, [60, 65, 69]), (48, [60, 64, 67])]
prog2 = [(50, [62, 65, 69]), (46, [58, 62, 65]), (48, [60, 64, 67]), (45, [61, 64, 69])]
bar = BEAT * 4
for b in range(BARS):
    root, chord = (prog if b < 8 else prog2)[b % 4]
    t0 = b * bar
    intro = b < 2
    # batterie
    for k in range(4):
        if not intro or k == 0: add(kick(), t0 + k * BEAT, 0, 0.9)
        if k % 2 == 1 and not intro: add(snare(), t0 + k * BEAT, 0.05, 0.55)
    for k in range(8): add(hat(k % 4 == 3), t0 + k * BEAT / 2, 0.3, 0.6 if not intro else 0.3)
    if b % 4 == 3 and not intro:   # roulement
        for k in range(4): add(snare(), t0 + 3 * BEAT + k * BEAT / 4, 0, 0.35 + k * 0.08)
    # basse (croches)
    bass = np.concatenate([saw(note(root - 12), BEAT / 2, 6) for _ in range(8)])
    add(lowpass(bass, 0.08), t0, 0, 0.5)
    # pad
    add(pad([note(m) for m in chord], bar), t0, 0, 0.18)
    # arpège (doubles croches)
    if b >= 4:
        seq = chord + [chord[1] + 12, chord[2] + 12, chord[1] + 12] + chord[::-1]
        for k in range(16):
            add(pluck(note(seq[k % len(seq)] + 12), BEAT / 4 * 1.6), t0 + k * BEAT / 4, -0.35 if k % 2 else 0.35, 0.12)
    # mélodie héroïque sur la 2e moitié
    if b >= 8:
        mel = [chord[2] + 12, chord[1] + 12, chord[2] + 12, chord[0] + 24][: 4]
        for k, m in enumerate(mel):
            add(saw(note(m), BEAT * 0.9, 2.5), t0 + k * BEAT, 0.1, 0.1)

mix /= np.max(np.abs(mix)) * 1.1
os.makedirs(sys.argv[1], exist_ok=True)
wav = '/tmp/combat.wav'
with wave.open(wav, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '3', f'{sys.argv[1]}/combat.ogg'], check=True)
print('musique ok', N / SR, 's')
