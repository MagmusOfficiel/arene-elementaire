"""Musiques par mode (synthétisées) -> client/public/audio/<piste>.ogg
Usage : python3 tools/gen_music2.py client/public/audio monde|royale|tournoi|boss"""
import numpy as np, subprocess, sys, os, wave

TRACK = sys.argv[2]
CFG = {'monde': (98, 16), 'royale': (150, 16), 'tournoi': (128, 16), 'boss': (164, 12)}
SR = 44100; BPM, BARS = CFG[TRACK]; BEAT = 60 / BPM
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


def taiko():
    t = t_(0.6); f = 70 + 60 * np.exp(-t * 18)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * envexp(0.6, 6) + rng.standard_normal(len(t)) * envexp(0.6, 40) * 0.3
def brass(f, dur):
    t = t_(dur); s = sum((2 * ((t * f * k) % 1) - 1) / k for k in (1, 2, 3))
    a = np.minimum(1, t / 0.06) * np.exp(-t * 1.2)
    return lowpass(s * a, 0.25)
def bell(f, dur):
    t = t_(dur); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t)) * envexp(dur, 3)

bar = BEAT * 4
if TRACK == 'monde':
    # Exploration : la mineur doux, cloches et nappes, batterie légère
    prog = [(45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62])]
    for b in range(BARS):
        root, chord = prog[b % 4]; t0 = b * bar
        add(pad([note(m) for m in chord] + [note(chord[0] + 12)], bar), t0, 0, 0.32)
        add(lowpass(saw(note(root - 12), bar, 1.2), 0.05), t0, 0, 0.35)
        for k in range(8):
            m = (chord + [chord[0] + 12])[[0, 2, 1, 3, 2, 1, 3, 2][k]] + 12
            if b >= 2 and (k % 2 == 0 or rng.random() < 0.5): add(bell(note(m), BEAT * 1.5), t0 + k * BEAT / 2, -0.3 if k % 2 else 0.3, 0.1)
        if b >= 4:
            for k in range(4):
                if k in (0, 2): add(kick(), t0 + k * BEAT, 0, 0.4)
                add(hat(), t0 + k * BEAT + BEAT / 2, 0.3, 0.35)
elif TRACK == 'royale':
    # Battle royale : tension, basse pulsée, ostinato, montée
    prog = [(50, [62, 65, 69]), (50, [62, 65, 70]), (48, [60, 63, 67]), (49, [61, 64, 68])]
    for b in range(BARS):
        root, chord = prog[b % 4]; t0 = b * bar
        for k in range(4):
            add(kick(), t0 + k * BEAT, 0, 0.8)
            if k % 2 == 1 and b >= 2: add(snare(), t0 + k * BEAT, 0.05, 0.45)
        for k in range(16): add(hat(k % 8 == 6), t0 + k * BEAT / 4, 0.3, 0.35)
        bass = np.concatenate([saw(note(root - 12 + (7 if k % 4 == 3 else 0)), BEAT / 4, 10) for k in range(16)])
        add(lowpass(bass, 0.1), t0, 0, 0.55)
        for k in range(8): add(pluck(note(chord[k % 3] + 12), BEAT / 2), t0 + k * BEAT / 2, -0.3 if k % 2 else 0.3, 0.12)
        add(pad([note(m) for m in chord], bar), t0, 0, 0.12 + 0.01 * b)
        if b >= 8:
            for k, m in enumerate([chord[2] + 12, chord[1] + 12, chord[0] + 12, chord[1] + 12]):
                add(saw(note(m), BEAT * 0.8, 3), t0 + k * BEAT, 0.1, 0.08)
elif TRACK == 'tournoi':
    # Tournoi : épique, taikos et cuivres
    prog = [(45, [57, 60, 64]), (41, [57, 60, 65]), (43, [55, 59, 62]), (40, [56, 59, 64])]
    for b in range(BARS):
        root, chord = prog[b % 4]; t0 = b * bar
        for k in (0, 1.5, 2, 3, 3.5): add(taiko(), t0 + k * BEAT, (k - 2) / 4, 0.7)
        add(snare(), t0 + 3 * BEAT, 0, 0.3)
        add(lowpass(saw(note(root - 12), bar, 0.8), 0.06), t0, 0, 0.45)
        add(pad([note(m) for m in chord], bar), t0, 0, 0.2)
        if b >= 4:
            mel = [chord[0] + 12, chord[2] + 12, chord[1] + 12, chord[2] + 12] if b % 2 == 0 else [chord[2] + 12, chord[0] + 24, chord[2] + 12, chord[1] + 12]
            for k, m in enumerate(mel): add(brass(note(m), BEAT * 0.95), t0 + k * BEAT, 0.05, 0.16)
else:
    # Boss : sombre et rapide, accords diminués
    prog = [(40, [52, 55, 58]), (41, [53, 56, 59]), (40, [52, 55, 58]), (39, [51, 54, 57])]
    for b in range(BARS):
        root, chord = prog[b % 4]; t0 = b * bar
        for k in range(8): add(kick(), t0 + k * BEAT / 2, 0, 0.75 if k % 2 == 0 else 0.5)
        for k in (1, 3): add(snare(), t0 + k * BEAT, 0, 0.55)
        for k in range(16): add(hat(), t0 + k * BEAT / 4, 0.3, 0.3)
        bass = np.concatenate([saw(note(root - 12), BEAT / 4, 12) for _ in range(16)])
        add(lowpass(bass, 0.12), t0, 0, 0.6)
        for k in range(4): add(brass(note(chord[k % 3] + 12), BEAT * 0.9), t0 + k * BEAT, 0, 0.13)
        add(taiko(), t0, 0, 0.8)

mix /= np.max(np.abs(mix)) * 1.1
os.makedirs(sys.argv[1], exist_ok=True)
wav = f'/tmp/{TRACK}.wav'
with wave.open(wav, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '2', f'{sys.argv[1]}/{TRACK}.ogg'], check=True)
print('musique', TRACK, round(N / SR, 1), 's')
