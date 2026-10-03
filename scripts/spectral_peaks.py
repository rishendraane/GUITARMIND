import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
import miniaudio
import numpy as np

decoded = miniaudio.decode_file("sample_audio.mp3")
samples = np.frombuffer(decoded.samples, dtype=np.int16).astype(np.float32) / 32768.0
if decoded.nchannels == 2:
    samples = samples.reshape(-1, 2).mean(axis=1)

sr = decoded.sample_rate

# Chromagram (12 pitch classes)
NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

# Standard pitch frequencies for octaves 2 to 6
def midi_to_hz(m):
    return 440.0 * (2.0 ** ((m - 69) / 12.0))

# FFT analysis in 1-second chunks
print("=== SPECTRAL ENERGY & DOMINANT FREQUENCIES (Second by Second) ===")
sec_len = sr
for s in range(0, int(len(samples) / sr)):
    chunk = samples[s*sec_len : (s+1)*sec_len]
    fft_vals = np.abs(np.fft.rfft(chunk * np.hanning(len(chunk))))
    freqs = np.fft.rfftfreq(len(chunk), 1.0 / sr)
    
    # Restrict to guitar range 80Hz - 1200Hz
    mask = (freqs >= 80) & (freqs <= 1200)
    guitar_freqs = freqs[mask]
    guitar_fft = fft_vals[mask]
    
    # Top 3 spectral peaks
    top_indices = np.argsort(guitar_fft)[-4:][::-1]
    top_peaks = []
    for idx in top_indices:
        f = guitar_freqs[idx]
        midi = int(round(69 + 12 * np.log2(f / 440.0)))
        note = f"{NOTE_NAMES[midi % 12]}{(midi // 12) - 1}"
        mag = guitar_fft[idx]
        top_peaks.append(f"{note} ({f:.0f}Hz, mag={mag:.0f})")
    
    print(f"Sec {s:02d}-{s+1:02d}: " + " | ".join(top_peaks))
