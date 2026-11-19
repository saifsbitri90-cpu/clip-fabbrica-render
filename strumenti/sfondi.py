"""Sfondi illustrati della puntata con FLUX.1 [schnell] (Apache 2.0) su Cloudflare Workers AI.

Piano gratuito: 10.000 neuroni al giorno. Un'immagine 1024x1024 a 8 passi costa circa 96 neuroni
(4 riquadri x 4,8 + 8 passi x 9,6), quindi un centinaio di sfondi al giorno. Il modello su Workers AI
accetta solo testo, passi e seme: l'immagine e' quadrata e la composizione la ritaglia al centro per il
verticale, per questo il prompt chiede gli elementi importanti al centro.

Accesso: CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN nel .env della fabbrica se ci sono (servono su
GitHub Actions), altrimenti la riga di comando ufficiale `cf` autorizzata con `cf auth login` (sul PC).
Uso: python strumenti/sfondi.py storyboard/<puntata>.json [--rifai]
"""
import base64
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

QUI = Path(__file__).resolve().parent.parent
ENV = QUI.parent / ".env"
USCITA = QUI / "public" / "serie" / "sfondi"
MODELLO = "@cf/black-forest-labs/flux-1-schnell"
# FLUX non capisce le negazioni: «no text» fa comparire scritte (provato il 18/11). Si descrive solo
# quello che si vuole, e dai prompt dei copioni si tolgono le frasi «no …».
# Stile A «cartone professionale» (guida grafica del 18/11): stesso linguaggio dei personaggi, contorni
# scuri uniformi e colori pieni. Il vecchio stile (nebbia, grana, colori spenti) sembrava semi-realistico
# accanto agli omini piatti. Provato il 18/11 su panchina e stadio: va bene senza ritocchi dopo.
STILE = ("2D cartoon background art for an animated TV series, clean bold uniform dark outlines around every shape, "
         "flat solid color fills with simple two-tone cel shading, simple geometric shapes, crisp and sharp everywhere, "
         "limited palette of deep green, dark anthracite, warm gold and warm white with small red accents, "
         "eye-level camera, empty scene, empty ground in the lower third, main elements in the center of the frame")


def pulisci(prompt: str) -> str:
    return re.sub(r",?\s*\b(?:no|without)\s+[a-z ]+?(?=,|$)", "", prompt, flags=re.IGNORECASE).strip(" ,")


def chiavi() -> tuple[str, str] | None:
    valori = {}
    if ENV.exists():
        for riga in ENV.read_text(encoding="utf-8").splitlines():
            if "=" in riga and not riga.lstrip().startswith("#"):
                k, v = riga.split("=", 1)
                valori[k.strip()] = v.strip().strip('"').strip("'")
    conto, token = valori.get("CLOUDFLARE_ACCOUNT_ID", ""), valori.get("CLOUDFLARE_API_TOKEN", "")
    return (conto, token) if conto and token else None


def genera_cf(prompt: str, seme: int) -> bytes:
    """stessa chiamata attraverso `cf ai run`, con l'accesso di `cf auth login`"""
    cf = shutil.which("cf") or shutil.which("cf.cmd")
    if not cf:
        sys.exit("Ne' chiavi nel .env ne' la riga di comando cf: installa cf (npm install -g cf) e fai cf auth login")
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump({"prompt": prompt[:2048], "steps": 8}, f)  # il modello rifiuta "seed" (errore 5006, 18/11)
    r = subprocess.run([cf, "ai", "run", MODELLO, "--body", f"@{f.name}"], capture_output=True, text=True, encoding="utf-8")
    Path(f.name).unlink(missing_ok=True)
    if r.returncode:
        sys.exit(f"cf ai run fallito: {(r.stderr or r.stdout)[:500]}")
    testo = r.stdout[r.stdout.find("{"):] if "{" in r.stdout else r.stdout
    dati = json.loads(testo)
    immagine = dati.get("image") or (dati.get("result") or {}).get("image")
    if not immagine:
        sys.exit(f"Risposta di cf senza immagine: {r.stdout[:300]}")
    return base64.b64decode(immagine)


def genera(prompt: str, seme: int, conto: str, token: str) -> bytes:
    corpo = json.dumps({"prompt": prompt[:2048], "steps": 8}).encode()
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
    accesso = chiavi()
    USCITA.mkdir(parents=True, exist_ok=True)
    for lg in sb.get("luoghi", []):
        file = USCITA / f"{lg['id']}.jpg"
        if file.exists() and not rifai:
            print(f"{file.name}: c'e' gia' (usa --rifai per rigenerarlo)")
            continue
        prompt = f"{pulisci(lg.get('prompt_sfondo_en', lg.get('descrizione', '')))}, {STILE}"
        seme = int(hashlib.sha1(lg["id"].encode()).hexdigest()[:6], 16)  # stesso luogo, stessa immagine
        file.write_bytes(genera(prompt, seme, *accesso) if accesso else genera_cf(prompt, seme))
        print(f"{file.name}: {file.stat().st_size // 1024} KB")
        # niente piu' copia sfocata: dal 18/11 nei primi piani il fondale si scurisce, non si sfoca
        vecchia = file.with_name(f"{lg['id']}_sfocato.jpg")
        if vecchia.exists():
            vecchia.unlink()


if __name__ == "__main__":
    argomenti = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not argomenti:
        sys.exit(__doc__)
    main(argomenti[0], "--rifai" in sys.argv)
