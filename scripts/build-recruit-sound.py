"""Build a short, softened recruitment cue from the licensed TomMusic archive."""
import argparse
import io
import math
import wave
from pathlib import Path
from zipfile import ZipFile
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('archive')
args = parser.parse_args()
source = 'Free Fantasy SFX Pack By TomMusic/WAV Files/SFX/Attacks/Bow Attacks Hits and Blocks/Bow Take Out 1.wav'
with ZipFile(args.archive) as archive:
    with wave.open(io.BytesIO(archive.read(source))) as audio:
        rate, channels, width = audio.getframerate(), audio.getnchannels(), audio.getsampwidth()
        assert width == 2, 'Expected signed 16-bit source'
        samples = np.frombuffer(audio.readframes(audio.getnframes()), dtype='<i2').reshape(-1, channels).astype(float) / 32768
# Skip leading silence, keep a brief equipment rustle, and soften its transient.
active = np.flatnonzero(np.max(np.abs(samples), axis=1) > 0.01)
assert active.size
start = max(0, int(active[0]) - int(rate * 0.005))
samples = samples[start:start + int(rate * 0.28)].copy()
alpha = 1 - math.exp(-2 * math.pi * 1700 / rate)
for _ in range(2):
    previous = np.zeros(channels)
    for i in range(len(samples)):
        previous = previous + alpha * (samples[i] - previous)
        samples[i] = previous
attack, release = int(rate * 0.015), int(rate * 0.08)
samples[:attack] *= np.linspace(0, 1, attack)[:, None]
samples[-release:] *= np.linspace(1, 0, release)[:, None]
peak = np.max(np.abs(samples))
if peak: samples *= min(1, 0.45 / peak)
target = Path(__file__).resolve().parent.parent / 'public/audio/tommusic/recruit-soft.wav'
with wave.open(str(target), 'wb') as output:
    output.setparams((channels, 2, rate, 0, 'NONE', 'not compressed'))
    output.writeframes((samples * 32767).astype('<i2').tobytes())
print(f'{target.name}: {len(samples) / rate:.2f}s')
