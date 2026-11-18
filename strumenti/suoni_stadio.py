"""Suoni da stadio per la serie a puntate, generati in codice (nessun diritto d'autore, seme fisso).

earshot (suoni.yml) fa solo effetti sintetici da interfaccia: fischio dell'arbitro, folla, boato,
fischi del pubblico e calcio al pallone si fanno qui con numpy. Uscita: public/suoni/*.mp3.
Uso: python strumenti/suoni_stadio.py   (serve ffmpeg nel PATH)
"""
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 44100
RNG = np.random.default_rng(209)
USCITA = Path(__file__).resolve().parent.parent / "public" / "suoni"


def tempo(sec: float) -> np.ndarray:
    return np.arange(int(sec * SR)) / SR


def rumore_colorato(n: int, basso: float, alto: float, pendenza: float = -0.5) -> np.ndarray:
    """rumore con spettro limitato a [basso, alto] Hz e pendenza in potenza (−0,5 = rosa)"""
    spettro = np.fft.rfft(RNG.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    forma = np.where((f > basso) & (f < alto), 1.0, 0.0) * np.power(np.maximum(f, 1.0), pendenza)
    # bordi morbidi per non avere filtri "a scalino"
    forma *= np.clip((f - basso * 0.7) / (basso * 0.6 + 1), 0, 1) * np.clip((alto * 1.3 - f) / (alto * 0.6), 0, 1)
    x = np.fft.irfft(spettro * forma, n)
    return x / (np.max(np.abs(x)) + 1e-9)


def inviluppo(n: int, attacco: float, rilascio: float) -> np.ndarray:
    e = np.ones(n)
    a, r = int(attacco * SR), int(rilascio * SR)
    if a:
        e[:a] = np.linspace(0, 1, a) ** 1.5
    if r:
        e[-r:] *= np.linspace(1, 0, r) ** 2
    return e


def fischio_singolo(sec: float) -> np.ndarray:
    t = tempo(sec)
    trillo = 34 + 3 * np.sin(2 * np.pi * 0.9 * t)  # la pallina del fischietto
    fase = 2 * np.pi * np.cumsum(3150 + 70 * np.sin(2 * np.pi * trillo * t)) / SR
    tono = np.sin(fase) + 0.28 * np.sin(2 * fase) + 0.08 * np.sin(3 * fase)
    tono *= 0.62 + 0.38 * np.sin(2 * np.pi * trillo * t)
    soffio = rumore_colorato(len(t), 2500, 6000, 0) * 0.12
    return (tono + soffio) * inviluppo(len(t), 0.012, 0.07)


def fischio() -> np.ndarray:
    pausa = np.zeros(int(0.09 * SR))
    return np.concatenate([fischio_singolo(0.22), pausa, fischio_singolo(0.65), np.zeros(int(0.3 * SR))])


def brusio(sec: float, luminosita: float) -> np.ndarray:
    """folla: tante bande di "voci" che si muovono lentamente sopra un letto di rumore rosa"""
    n = int(sec * SR)
    t = tempo(sec)
    letto = rumore_colorato(n, 180, 3500 * luminosita, -0.6)
    voci = np.zeros(n)
    for _ in range(14):
        centro = RNG.uniform(350, 1400 * luminosita)
        banda = rumore_colorato(n, centro * 0.8, centro * 1.25, 0)
        lfo = 0.5 + 0.5 * np.sin(2 * np.pi * RNG.uniform(0.15, 0.9) * t + RNG.uniform(0, 6.28))
        voci += banda * lfo ** 2
    x = letto * 0.7 + voci / 14 * 1.4
    return x / (np.max(np.abs(x)) + 1e-9)


def folla() -> np.ndarray:
    sec = 8.0
    x = brusio(sec + 1, 1.0)
    # anello: l'ultimo secondo sfuma nel primo, cosi' il file si ripete senza scatti
    n, c = int(sec * SR), int(1.0 * SR)
    croce = np.linspace(0, 1, c)
    x[:c] = x[:c] * croce + x[n:n + c] * (1 - croce)
    return x[:n] * 0.8


def boato() -> np.ndarray:
    sec = 3.2
    x = brusio(sec, 1.9)
    t = tempo(sec)
    e = np.clip(t / 0.35, 0, 1) ** 1.2 * np.where(t > 1.3, np.exp(-(t - 1.3) / 0.9), 1.0)
    return x * e


def fischi_stadio() -> np.ndarray:
    sec = 3.0
    n = int(sec * SR)
    t = tempo(sec)
    x = brusio(sec, 0.9) * 0.45
    # "buu": rumore basso con una formante intorno a 300 Hz
    x += rumore_colorato(n, 160, 420, 0) * 0.55 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t))
    for _ in range(26):  # fischi col dito in bocca, che scendono
        inizio, durata = RNG.uniform(0, sec - 0.5), RNG.uniform(0.35, 0.9)
        k0, k1 = int(inizio * SR), min(n, int((inizio + durata) * SR))
        tt = t[: k1 - k0]
        f0 = RNG.uniform(1900, 3300)
        fase = 2 * np.pi * np.cumsum(f0 - RNG.uniform(200, 700) * tt / durata) / SR
        x[k0:k1] += np.sin(fase) * inviluppo(k1 - k0, 0.04, 0.12) * RNG.uniform(0.08, 0.22)
    e = np.clip(t / 0.25, 0, 1) * np.where(t > 2.2, np.exp(-(t - 2.2) / 0.4), 1.0)
    return x * e


def calcio() -> np.ndarray:
    sec = 0.45
    t = tempo(sec)
    colpo = np.sin(2 * np.pi * np.cumsum(60 + 110 * np.exp(-t / 0.025)) / SR) * np.exp(-t / 0.09)
    schiocco = rumore_colorato(len(t), 900, 4200, 0) * np.exp(-t / 0.012) * 0.6
    clic = rumore_colorato(len(t), 4000, 12000, 0) * np.exp(-t / 0.003) * 0.4
    return colpo + schiocco + clic


def salva(nome: str, x: np.ndarray) -> None:
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.7  # picco a circa −3 dBFS
    wav = USCITA / f"{nome}.wav"
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-c:a", "libmp3lame", "-q:a", "3",
                    str(USCITA / f"{nome}.mp3")], check=True)
    wav.unlink()
    print(f"{nome}.mp3  {len(x) / SR:.2f} s")


if __name__ == "__main__":
    USCITA.mkdir(parents=True, exist_ok=True)
    for nome, funz in [("fischio", fischio), ("folla", folla), ("boato", boato),
                       ("fischi_stadio", fischi_stadio), ("calcio_pallone", calcio)]:
        salva(nome, funz())
