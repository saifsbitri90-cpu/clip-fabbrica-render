"""Sfondi illustrati della puntata con FLUX.1 [schnell] (Apache 2.0) su Cloudflare Workers AI.

Piano gratuito: 10.000 neuroni al giorno. Un'immagine 1024x1024 a 8 passi costa circa 96 neuroni
(4 riquadri x 4,8 + 8 passi x 9,6), quindi un centinaio di sfondi al giorno. Il modello su Workers AI
accetta solo testo, passi e seme: l'immagine e' quadrata e la composizione la ritaglia al centro per il
verticale, per questo il prompt chiede gli elementi importanti al centro.

Chiavi in C:\\Users\\Lenovo\\clip-fabbrica\\.env (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN).
Uso: python strumenti/sfondi.py storyboard/<puntata>.json [--rifai]
"""
import base64
import hashlib
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

QUI = Path(__file__).resolve().parent.parent
ENV = QUI.parent / ".env"
USCITA = QUI / "public" / "serie" / "sfondi"
MODELLO = "@cf/black-forest-labs/flux-1-schnell"
STILE = ("flat vector illustration, premium animated explainer style, muted desaturated palette, soft atmospheric fog, "
         "layered depth, clean geometric shapes, subtle film grain, eye-level camera, empty ground in the lower third, "
         "main elements in the center of the frame, no people, no characters, no text, no letters, no logos, no watermark")


def chiavi() -> tuple[str, str]:
    valori = {}
    if ENV.exists():
        for riga in ENV.read_text(encoding="utf-8").splitlines():
            if "=" in riga and not riga.lstrip().startswith("#"):
                k, v = riga.split("=", 1)
                valori[k.strip()] = v.strip().strip('"').strip("'")
    conto, token = valori.get("CLOUDFLARE_ACCOUNT_ID", ""), valori.get("CLOUDFLARE_API_TOKEN", "")
    if not conto or not token:
        sys.exit(f"Mancano CLOUDFLARE_ACCOUNT_ID o CLOUDFLARE_API_TOKEN in {ENV}")
    return conto, token


def genera(prompt: str, seme: int, conto: str, token: str) -> bytes:
    corpo = json.dumps({"prompt": prompt[:2048], "steps": 8, "seed": seme}).encode()
    req = urllib.request.Request(f"https://api.cloudflare.com/client/v4/accounts/{conto}/ai/run/{MODELLO}", data=corpo,
                                 headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            risposta = json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"Cloudflare ha risposto {e.code}: {e.read().decode(errors='replace')[:400]}")
    if not risposta.get("success", True) or "result" not in risposta:
        sys.exit(f"Risposta inattesa: {str(risposta)[:400]}")
    return base64.b64decode(risposta["result"]["image"])


def main(percorso: str, rifai: bool) -> None:
    sb = json.loads(Path(percorso).read_text(encoding="utf-8"))
    conto, token = chiavi()
    USCITA.mkdir(parents=True, exist_ok=True)
    for lg in sb.get("luoghi", []):
        file = USCITA / f"{lg['id']}.jpg"
        if file.exists() and not rifai:
            print(f"{file.name}: c'e' gia' (usa --rifai per rigenerarlo)")
            continue
        prompt = f"{lg.get('prompt_sfondo_en', lg.get('descrizione', ''))}, {STILE}"
        seme = int(hashlib.sha1(lg["id"].encode()).hexdigest()[:6], 16)  # stesso luogo, stessa immagine
        file.write_bytes(genera(prompt, seme, conto, token))
        print(f"{file.name}: {file.stat().st_size // 1024} KB")


if __name__ == "__main__":
    argomenti = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not argomenti:
        sys.exit(__doc__)
    main(argomenti[0], "--rifai" in sys.argv)
