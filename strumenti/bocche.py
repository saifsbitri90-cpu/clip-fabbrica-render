"""Bocche dei personaggi sulla voce, con Rhubarb Lip Sync (riconoscimento «phonetic»: funziona anche in italiano).

Legge public/props.json e public/voce.mp3 (scritti da serie_voce.py). Per ogni scena con una battuta tra
virgolette ritaglia quel pezzo di voce, lo passa a Rhubarb e scrive le forme della bocca in scene[i].bocche,
a tempo assoluto: [[t, "A"], [t, "X"], ...]. Le forme: A chiusa (M B P), B appena aperta, C aperta a metà,
D spalancata, E tonda (O), F labbra in avanti (U), G denti sul labbro (F V), H lingua (L), X a riposo.
uso: python strumenti/bocche.py <percorso del programma rhubarb>
"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

PUB = Path(__file__).resolve().parent.parent / "public"
rhubarb = sys.argv[1]
ffmpeg = [shutil.which("ffmpeg")] if shutil.which("ffmpeg") else ["npx", "remotion", "ffmpeg"]

props = json.loads((PUB / "props.json").read_text(encoding="utf-8"))
for s in props["scene"]:
    parole = [w for p in s["pezzi"] for w in p["parole"]]
    q = [i for i, w in enumerate(parole) if w.get("q")]
    if not q:
        continue
    da = max(s["da"], parole[q[0]]["t"] - 0.08)
    dopo = q[-1] + 1
    a = parole[dopo]["t"] if dopo < len(parole) else s["a"]
    with tempfile.TemporaryDirectory() as d:
        wav = Path(d) / "battuta.wav"
        subprocess.run([*ffmpeg, "-v", "error", "-y", "-ss", f"{da:.3f}", "-to", f"{a:.3f}", "-i", str(PUB / "voce.mp3"),
                        "-ac", "1", "-ar", "16000", str(wav)], check=True)
        uscita = subprocess.run([rhubarb, "-r", "phonetic", "-f", "json", "--extendedShapes", "GHX", "-q", str(wav)],
                                check=True, capture_output=True, text=True).stdout
    forme = json.loads(uscita)["mouthCues"]
    s["bocche"] = [[round(da + f["start"], 3), f["value"]] for f in forme]
    print(f"scena {s['n']}: {len(forme)} forme della bocca tra {da:.2f} e {a:.2f} s: {''.join(f['value'] for f in forme)}")
(PUB / "props.json").write_text(json.dumps(props, ensure_ascii=False, indent=1), encoding="utf-8")
