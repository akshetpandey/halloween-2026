#!/usr/bin/env python3
"""Create original deterministic audio to exercise the offline premix pipeline.

This is an engineering fixture, not a candidate party recording. Uses only the
Python standard library; no samples, downloads, plugins or audio devices.
"""
import argparse
from array import array
import hashlib
import json
import math
from pathlib import Path
import random
import sys
import wave


SAMPLE_RATE = 48000
PEAK_TARGET = 0.45  # -6.94 dBFS, below the requested -6 dBFS ceiling.
ORIGIN = 'procedural synthetic, original test audio'
DEFAULT_OUTPUT = Path(__file__).resolve().parent / '.local/reaper-proof/sources'
TAU = 2 * math.pi


def _frequency(midi_note):
    return 440 * 2 ** ((midi_note - 69) / 12)


def _render(path, bpm, bars, seed, alternate=False):
    beat = 60 / bpm
    frames = round(bars * 4 * beat * SAMPLE_RATE)
    audio = array('f', [0.0]) * (2 * frames)
    rng = random.Random(seed)

    def add(start, duration, oscillator, amplitude, pan=0.0):
        first = round(start * SAMPLE_RATE)
        count = min(round(duration * SAMPLE_RATE), frames - first)
        left = math.sqrt((1 - pan) / 2)
        right = math.sqrt((1 + pan) / 2)
        for i in range(max(0, count)):
            value = oscillator(i / SAMPLE_RATE) * amplitude
            index = 2 * (first + i)
            audio[index] += value * left
            audio[index + 1] += value * right

    def kick(t):
        # Integrated exponential pitch fall, plus a short noise beater.
        phase = TAU * (49 * t + 2.8 * (1 - math.exp(-35 * t)))
        attack = min(1, t / .0015)
        return attack * (math.sin(phase) * math.exp(-12 * t)
                         + .08 * rng.uniform(-1, 1) * math.exp(-300 * t))

    def hat(t):
        envelope = min(1, t / .0008) * math.exp(-65 * t)
        metallic = .18 * (math.sin(TAU * 7093 * t) + math.sin(TAU * 9029 * t))
        return (rng.uniform(-1, 1) + metallic) * envelope

    def clap(t):
        envelope = sum(math.exp(-65 * (t - delay))
                       for delay in (0, .011, .023) if t >= delay)
        return rng.uniform(-1, 1) * envelope * min(1, t / .001)

    def bass(note, event_offset):
        frequency = _frequency(note)

        def sound(t):
            phase = TAU * frequency * t
            tone = (math.sin(phase) + .22 * math.sin(2 * phase)
                    + .08 * math.sin(3 * phase))
            duck = .22 + .78 * min(1, ((event_offset + t) % beat) / .14)
            return tone * min(1, t / .005) * math.exp(-10 * t) * duck
        return sound

    def pluck(note):
        frequency = _frequency(note)

        def sound(t):
            phase = TAU * frequency * t
            # A fading upper partial makes a simple acid/pluck articulation.
            bright = math.exp(-9 * t)
            tone = math.sin(phase) + bright * sum(
                math.sin(harmonic * phase) / harmonic for harmonic in (2, 3, 4, 5))
            return tone * min(1, t / .003) * math.exp(-7 * t)
        return sound

    def chord(notes):
        frequencies = [_frequency(n) for n in notes]

        def sound(t):
            return (sum(math.sin(TAU * f * t) for f in frequencies) / 3
                    * min(1, t / .012) * math.exp(-4 * t))
        return sound

    # C minor throughout, changing bass motion and upper voicing after phrases.
    bass_patterns = ([36, 36, 43, 36, 46, 36], [36, 43, 39, 36, 46, 43],
                     [36, 36, 46, 43, 39, 36], [36, 43, 46, 48, 43, 36])
    offsets = (.5, 1.25, 1.75, 2.5, 3.25, 3.75)
    for bar in range(bars):
        start = bar * 4 * beat
        phrase = (bar // 8 + int(alternate)) % len(bass_patterns)
        for pulse in range(4):
            add(start + pulse * beat, .36, kick, .52)
        for pulse in (1, 3):
            add(start + pulse * beat, .14, clap, .105, -.06)
        for step in range(8):
            amplitude = .04 if step % 2 else .025
            add(start + step * .5 * beat, .095, hat, amplitude,
                .4 if step % 2 else -.35)
        if alternate or bar >= 16:
            # Quiet sixteenth pickups distinguish later sections/fixture B.
            for offset in (1.75, 3.75):
                add(start + offset * beat, .055, hat, .025, -.5)
        for index, offset in enumerate(offsets):
            add(start + offset * beat, .23, bass(bass_patterns[phrase][index],
                offset * beat), .29)
        if bar % 2 == 0:
            notes = (60, 63, 67) if phrase % 2 == 0 else (58, 63, 67)
            add(start + .5 * beat, .72, chord(notes), .1, -.3)
            add(start + 1.25 * beat, .6, chord(notes), .025, .45)
        melody = (67, 63, 60, 70) if not alternate else (60, 67, 70, 63)
        for index, offset in enumerate((.75, 2.75)):
            note = melody[(bar + index + phrase) % len(melody)]
            add(start + offset * beat, .3, pluck(note), .055, .3)

    duplicate = None
    if not alternate:
        # Exact sample copy, not just the same nominal notes or seed.
        phrase_frames = round(8 * 4 * beat * SAMPLE_RATE)
        audio[2 * phrase_frames:4 * phrase_frames] = audio[:2 * phrase_frames]
        duplicate = {'first_source_seconds': [0, 15],
                     'duplicate_source_seconds': [15, 30],
                     'frames_per_phrase': phrase_frames}

    # Prevent a truncated tail from clicking without altering the duplicate.
    tail_frames = min(round(.04 * SAMPLE_RATE), frames)
    for i in range(tail_frames):
        gain = (tail_frames - 1 - i) / max(1, tail_frames - 1)
        index = 2 * (frames - tail_frames + i)
        audio[index] *= gain
        audio[index + 1] *= gain
    peak_before = max(abs(sample) for sample in audio)
    scale = PEAK_TARGET / peak_before if peak_before else 1.0
    pcm = array('h', (round(sample * scale * 32767) for sample in audio))
    peak_pcm = max(abs(value) for value in pcm)
    if sys.byteorder != 'little':
        pcm.byteswap()
    with wave.open(str(path), 'wb') as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm.tobytes())
    return {'path': str(path.resolve()), 'bpm': bpm, 'bars': bars,
            'beats_per_bar': 4, 'duration_seconds': frames / SAMPLE_RATE,
            'nominal_duration_seconds': bars * 4 * beat, 'frames': frames,
            'sample_rate': SAMPLE_RATE, 'channels': 2, 'sample_width_bytes': 2,
            'peak_dbfs': 20 * math.log10(peak_pcm / 32768), 'seed': seed,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'duplicate_phrase': duplicate, 'tonal_palette': 'C natural minor'}


def create_fixtures(output: Path):
    """Write two engineering fixtures plus JSON; return exact-file metadata."""
    output = Path(output).expanduser().resolve()
    output.mkdir(parents=True, exist_ok=True)
    tracks = {
        'a': _render(output / 'synthetic-a-128bpm.wav', 128, 32, 260619),
        'b': _render(output / 'synthetic-b-132bpm.wav', 132, 24, 260620, True),
    }
    result = {
        'origin': ORIGIN, 'tracks': tracks,
        'intended_a_cut': {'source_seconds': [15, 30],
                           'reason': 'Exact duplicate of source 0–15 seconds.',
                           'keep_source_seconds': [[0, 15], [30, 60]]},
        'proof_plan': {'target_bpm': 128, 'b_playrate': 128 / 132,
                       'a_edited_nominal_seconds': 45,
                       'b_at_target_nominal_seconds': 45,
                       'overlap_seconds': 15, 'master_nominal_seconds': 75},
        'preview_note': ('Original procedural test audio for proving file import, a known '
                         'repetition cut, pitch-preserving tempo change, transition '
                         'automation and render mechanics only. It does not prove '
                         'real-track analysis, musical mix quality, a party-approved '
                         'selection, or the physical playback route.'),
    }
    (output / 'fixtures.json').write_text(json.dumps(result, indent=2) + '\n')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    print(json.dumps(create_fixtures(args.output), indent=2))


if __name__ == '__main__':
    main()
