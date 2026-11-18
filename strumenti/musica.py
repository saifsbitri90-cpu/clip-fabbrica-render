"""Base musicale lo-fi generata in codice: nessun diritto d'autore, sempre uguale (seme fisso).

90 BPM, La minore - Fa - Do - Sol, 16 battute (circa 42 s) che si ripetono senza stacco.
Strumenti: pad morbido, basso, arpeggio pizzicato, cassa e charleston leggeri.
Uso: python strumenti/musica.py public/suoni/musica.wav
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 90
BATTUTA = 4 * 60 / BPM
ACCORDI = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G (MIDI)
rng = np.random.default_rng(7)


def hz(nota: float) -> float:
    return 440.0 * 2 ** ((nota - 69) / 12)


def inviluppo(n: int, attacco: float, rilascio: float) -> np.ndarray:
    a, r = max(1, int(attacco * SR)), max(1, int(rilascio * SR))
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r)
    return e


def pad(nota: int, durata: float) -> np.ndarray:
    t = np.arange(int(durata * SR)) / SR
    s = sum(np.sin(2 * np.pi * hz(nota) * (1 + d) * t) for d in (-0.004, 0, 0.005)) / 3
    s += 0.25 * np.sin(2 * np.pi * hz(nota) * 2 * t)
    return s * inviluppo(len(t), 0.6, 0.8) * 0.18


def pizzico(nota: int, durata: float) -> np.ndarray:
    t = np.arange(int(durata * SR)) / SR
    s = np.sin(2 * np.pi * hz(nota) * t) + 0.35 * np.sin(2 * np.pi * hz(nota) * 3 * t) * np.exp(-t * 9)
    return s * np.exp(-t * 4.5) * 0.22


def cassa() -> np.ndarray:
    t = np.arange(int(0.35 * SR)) / SR
    f = 110 * np.exp(-t * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 0.55


def charleston() -> np.ndarray:
    n = int(0.06 * SR)
    rumore = rng.standard_normal(n)
    rumore = np.diff(rumore, prepend=0)  # passa-alto grezzo
    return rumore * np.exp(-np.arange(n) / SR * 70) * 0.06


def main(uscita: str) -> None:
    battute = 16
    totale = int(battute * BATTUTA * SR)
    mix = np.zeros((totale, 2))

    def metti(suono: np.ndarray, inizio_s: float, pan: float = 0.0) -> None:
        i = int(inizio_s * SR)
        f = min(totale, i + len(suono))
        if f <= i:
            return
        mix[i:f, 0] += suono[: f - i] * (1 - pan) * 0.5 * 2
        mix[i:f, 1] += suono[: f - i] * (1 + pan) * 0.5 * 2

    for b in range(battute):
        accordo = ACCORDI[(b // 2) % 4]
        t0 = b * BATTUTA
        if b % 2 == 0:
            for nota in accordo:
                metti(pad(nota, BATTUTA * 2 + 0.6), t0)
            metti(pad(accordo[0] - 24, BATTUTA * 2), t0)  # basso
        for k in range(8):  # arpeggio a crome
            nota = accordo[k % 3] + (12 if k in (3, 7) else 0)
            metti(pizzico(nota, 0.6), t0 + k * BATTUTA / 8, pan=0.3 if k % 2 else -0.3)
        for k in range(4):
            if k in (0, 2):
                metti(cassa(), t0 + k * BATTUTA / 4)
            metti(charleston(), t0 + k * BATTUTA / 4 + BATTUTA / 8, pan=0.2)

    # coda che rientra nell'inizio: il giro si ripete senza scatto
    sfuma = int(0.5 * SR)
    mix[:sfuma] *= np.linspace(0.6, 1, sfuma)[:, None]
    mix[-sfuma:] *= np.linspace(1, 0.6, sfuma)[:, None]
    picco = np.max(np.abs(mix))
    mix = mix / picco * 0.5  # circa -6 dBFS di picco; nel missaggio va molto piu' in basso
    dati = (mix * 32767).astype(np.int16)
    Path(uscita).parent.mkdir(parents=True, exist_ok=True)
    with wave.open(uscita, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(dati.tobytes())
    print(f"{uscita}: {totale / SR:.1f} s")


if __name__ == "__main__":
    main(sys.argv[1])
