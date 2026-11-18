"""Dialogo a due voci per VoxelHD: una battuta per scena, ogni battuta con la voce di chi parla.

Controlli prima del render (costano zero): frasi non vuote, card corte, durata 12-59 s.
Storyboard: {"lingua": "en", "etichetta": "...", "evidenzia": ["parola", ...],
             "scene": [{"chi": "tu" | "claude", "frase": "...", "inquadratura": "largo|medio|primo",
                        "card": {"titolo": "...", "valore": "..."}}]}
"""
import asyncio
import json
import sys
from pathlib import Path

import edge_tts
from mutagen.mp3 import MP3

VOCI = {"en": {"tu": "en-US-AndrewNeural", "claude": "en-US-AvaNeural"},
        "it": {"tu": "it-IT-DiegoNeural", "claude": "it-IT-ElsaNeural"}}
PAUSA = 0.12


async def battuta(testo: str, voce: str, uscita: Path) -> list[dict]:
    parole = []
    com = edge_tts.Communicate(testo, voce, rate="+6%", boundary="WordBoundary")
    with uscita.open("wb") as f:
        async for pezzo in com.stream():
            if pezzo["type"] == "audio":
                f.write(pezzo["data"])
            elif pezzo["type"] == "WordBoundary":
                parole.append({"t": pezzo["offset"] / 1e7, "d": pezzo["duration"] / 1e7, "w": pezzo["text"]})
    return parole


def main(percorso: str) -> None:
    sb = json.loads(Path(percorso).read_text(encoding="utf-8"))
    errori = [f"scena {i + 1}: frase vuota" for i, s in enumerate(sb["scene"]) if not s.get("frase", "").strip()]
    errori += [f"scena {i + 1}: valore della card oltre 8 caratteri" for i, s in enumerate(sb["scene"])
               if s.get("card") and len(str(s["card"].get("valore", ""))) > 8]
    if errori:
        sys.exit("STORYBOARD NON VALIDO:\n" + "\n".join(errori))

    public = Path("public"); public.mkdir(exist_ok=True)
    tmp = Path("out/tmp"); tmp.mkdir(parents=True, exist_ok=True)
    voci = VOCI[sb.get("lingua", "en")]
    tutte, scene, t0 = [], [], 0.0
    with (public / "voce.mp3").open("wb") as uscita:
        for i, s in enumerate(sb["scene"]):
            f = tmp / f"b{i}.mp3"
            parole = asyncio.run(battuta(s["frase"], voci[s["chi"]], f))
            durata = MP3(f).info.length
            uscita.write(f.read_bytes())
            tutte += [{**p, "t": p["t"] + t0, "chi": s["chi"]} for p in parole]
            scene.append({"da": t0, "a": t0 + durata + PAUSA, "chi": s["chi"],
                          "inquadratura": s.get("inquadratura", "medio"), **({"card": s["card"]} if s.get("card") else {})})
            t0 += durata
    if not 12 <= t0 <= 59:
        sys.exit(f"DURATA {t0:.1f} s fuori da 12-59 s")
    suoni = sorted(p.stem for p in (public / "suoni").glob("*.mp3"))  # solo i suoni che esistono
    props = {"durata": t0, "parole": tutte, "scene": scene, "etichetta": sb.get("etichetta", ""),
             "audio": "voce.mp3", "evidenzia": sb.get("evidenzia", []), "suoni": suoni}
    (public / "props.json").write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
    print(f"dialogo {t0:.1f} s, {len(tutte)} parole, {len(scene)} battute: controlli superati")


if __name__ == "__main__":
    main(sys.argv[1])
