"""Intervallo di fotogrammi di una scena, per renderizzare solo quella (scena campione).
Legge public/props.json scritto da serie_voce.py. Uso: python strumenti/fotogrammi_scena.py <n> [fps]
Stampa per esempio «690-812», da passare a `remotion render --frames=`."""
import json
import sys
from pathlib import Path

n = int(sys.argv[1])
fps = int(sys.argv[2]) if len(sys.argv) > 2 else 30
props = json.loads((Path(__file__).resolve().parent.parent / "public" / "props.json").read_text(encoding="utf-8"))
scena = next((s for s in props["scene"] if s["n"] == n), None)
if scena is None:
    sys.exit(f"scena {n} non trovata (ci sono {[s['n'] for s in props['scene']]})")
print(f"{round(scena['da'] * fps)}-{max(round(scena['da'] * fps), round(scena['a'] * fps) - 1)}")
