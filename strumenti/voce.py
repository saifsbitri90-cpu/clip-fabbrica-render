"""Dallo storyboard alla voce e a public/props.json, con i controlli PRIMA del render.

Controllare i passaggi intermedi costa zero; un render sbagliato costa minuti di Actions:
qui si verifica che le scene abbiano testo, che i titoli entrino nella striscia e che la
durata stia fra 15 e 59 secondi. Se un controllo fallisce il workflow si ferma qui.

Storyboard: {"lingua": "en", "genere": "m", "colore": "#E8743B",
             "scene": [{"titolo": "max 26 caratteri", "frase": "quello che dice la voce"}]}
"""
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

VOCI = {"it": {"m": "it-IT-DiegoNeural", "f": "it-IT-ElsaNeural"},
        "en": {"m": "en-US-AndrewNeural", "f": "en-US-AvaNeural"}}


async def parla(testo: str, voce: str, uscita: Path) -> list[dict]:
    parole = []
    com = edge_tts.Communicate(testo, voce, rate="+8%", boundary="WordBoundary")
    with uscita.open("wb") as f:
        async for pezzo in com.stream():
            if pezzo["type"] == "audio":
                f.write(pezzo["data"])
            elif pezzo["type"] == "WordBoundary":
                parole.append({"t": pezzo["offset"] / 1e7, "d": pezzo["duration"] / 1e7, "w": pezzo["text"]})
    return parole


def main(percorso: str) -> None:
    sb = json.loads(Path(percorso).read_text(encoding="utf-8"))
    errori = []
    for i, s in enumerate(sb["scene"]):
        if not s.get("frase", "").strip():
            errori.append(f"scena {i + 1}: frase vuota")
        if len(s.get("titolo", "")) > 26:
            errori.append(f"scena {i + 1}: titolo di {len(s['titolo'])} caratteri, la striscia ne regge 26")
    if errori:
        sys.exit("STORYBOARD NON VALIDO:\n" + "\n".join(errori))

    testo = " ".join(s["frase"].strip() for s in sb["scene"])
    public = Path("public")
    public.mkdir(exist_ok=True)
    parole = asyncio.run(parla(testo, VOCI[sb["lingua"]][sb.get("genere", "m")], public / "voce.mp3"))
    durata = parole[-1]["t"] + parole[-1]["d"] if parole else 0
    if not 15 <= durata <= 59:
        sys.exit(f"DURATA {durata:.1f} s fuori da 15-59 s: allunga o accorcia le frasi")

    # ogni scena comincia sulla sua prima parola
    scene, indice = [], 0
    for s in sb["scene"]:
        n = len(s["frase"].split())
        da = parole[min(indice, len(parole) - 1)]["t"]
        indice += n
        scene.append({"da": da, "titolo": s["titolo"]})
    for k, s in enumerate(scene):
        s["a"] = scene[k + 1]["da"] if k + 1 < len(scene) else durata + 1
    props = {"durata": durata, "parole": parole, "scene": scene,
             "colore": sb.get("colore", "#E8743B"), "audio": "voce.mp3"}
    (public / "props.json").write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
    print(f"voce {durata:.1f} s, {len(parole)} parole, {len(scene)} scene: controlli superati")


if __name__ == "__main__":
    main(sys.argv[1])
