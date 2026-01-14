#!/usr/bin/env python3
"""
Beat Analyzer with Bass/Snare Separation

Uses librosa for spectral analysis to separate kick (bass) and snare hits.

Usage:
    python analyze-beats.py <audio_file>
    python analyze-beats.py Music/track.mp3

Output:
    JSON to stdout: { "bass_hits": [...], "snare_hits": [...], "bpm": N, "all_beats": [...] }
"""

import sys
import json
import warnings
import numpy as np

# Suppress librosa warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

try:
    import librosa
except ImportError:
    print(json.dumps({"error": "librosa not installed. Run: pip install librosa"}), file=sys.stderr)
    sys.exit(1)

try:
    from scipy.signal import butter, filtfilt
except ImportError:
    print(json.dumps({"error": "scipy not installed. Run: pip install scipy"}), file=sys.stderr)
    sys.exit(1)


def butter_bandpass(lowcut: float, highcut: float, sr: int, order: int = 5):
    """Create a butterworth bandpass filter."""
    nyq = 0.5 * sr
    low = lowcut / nyq
    high = highcut / nyq
    # Clamp to valid range
    low = max(0.001, min(low, 0.999))
    high = max(0.001, min(high, 0.999))
    if low >= high:
        high = low + 0.01
    b, a = butter(order, [low, high], btype='band')
    return b, a


def apply_bandpass(data: np.ndarray, lowcut: float, highcut: float, sr: int) -> np.ndarray:
    """Apply bandpass filter to audio data."""
    b, a = butter_bandpass(lowcut, highcut, sr, order=3)
    return filtfilt(b, a, data)


def detect_onsets(y: np.ndarray, sr: int, min_interval: float = 0.1) -> list[float]:
    """Detect onsets in audio signal."""
    # Get onset envelope
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)

    # Detect onset frames
    onset_frames = librosa.onset.onset_detect(
        onset_envelope=onset_env,
        sr=sr,
        backtrack=False,
        normalize=True
    )

    # Convert frames to times
    onset_times = librosa.frames_to_time(onset_frames, sr=sr)

    # Filter out onsets too close together
    if len(onset_times) == 0:
        return []

    filtered = [onset_times[0]]
    for t in onset_times[1:]:
        if t - filtered[-1] >= min_interval:
            filtered.append(t)

    return [round(t, 3) for t in filtered]


def analyze_audio(filepath: str) -> dict:
    """
    Analyze audio file for bass and snare hits.

    Approach:
    1. Load audio and apply HPSS to isolate percussive content
    2. Filter percussive signal into bass (20-150Hz) and snare (150-400Hz) bands
    3. Detect onsets in each band
    4. Calculate BPM from combined beats
    """
    # Load audio (mono, native sample rate)
    y, sr = librosa.load(filepath, sr=None, mono=True)
    duration = librosa.get_duration(y=y, sr=sr)

    # Harmonic-Percussive Source Separation
    # This isolates drums/transients from melodic content
    y_harmonic, y_percussive = librosa.effects.hpss(y, margin=3.0)

    # Bass/kick detection (20-150 Hz)
    # Low frequencies where kick drum lives
    try:
        y_bass = apply_bandpass(y_percussive, 20, 150, sr)
        bass_hits = detect_onsets(y_bass, sr, min_interval=0.15)
    except Exception:
        bass_hits = []

    # Snare detection (150-400 Hz)
    # Mid frequencies where snare crack lives
    try:
        y_snare = apply_bandpass(y_percussive, 150, 400, sr)
        snare_hits = detect_onsets(y_snare, sr, min_interval=0.15)
    except Exception:
        snare_hits = []

    # Combined beats (for backwards compatibility)
    all_beats = sorted(set(bass_hits + snare_hits))

    # Filter combined beats with minimum interval
    if len(all_beats) > 1:
        filtered_beats = [all_beats[0]]
        for t in all_beats[1:]:
            if t - filtered_beats[-1] >= 0.1:
                filtered_beats.append(t)
        all_beats = filtered_beats

    # Calculate BPM from onset strength
    try:
        tempo, _ = librosa.beat.beat_track(y=y_percussive, sr=sr)
        # Handle both scalar and array returns from different librosa versions
        if hasattr(tempo, '__len__'):
            bpm = int(round(float(tempo[0])))
        else:
            bpm = int(round(float(tempo)))
    except Exception:
        # Fallback: estimate from beat intervals
        if len(all_beats) >= 4:
            intervals = np.diff(all_beats[:20])
            avg_interval = np.median(intervals)
            bpm = int(round(60 / avg_interval)) if avg_interval > 0 else 120
        else:
            bpm = 120

    return {
        "bass_hits": bass_hits,
        "snare_hits": snare_hits,
        "all_beats": all_beats,
        "bpm": bpm,
        "duration": round(duration, 2),
        "bass_count": len(bass_hits),
        "snare_count": len(snare_hits)
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python analyze-beats.py <audio_file>"}))
        sys.exit(1)

    filepath = sys.argv[1]

    try:
        result = analyze_audio(filepath)
        print(json.dumps(result))
    except FileNotFoundError:
        print(json.dumps({"error": f"File not found: {filepath}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
