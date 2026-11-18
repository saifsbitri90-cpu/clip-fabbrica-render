"""Storyboard della puntata (il JSON di ChatGPT o del batch di Claude) -> voce edge-tts, tempi di ogni
parola, scritte a pezzi e public/props.json, con i controlli PRIMA del render (un render sbagliato
costa minuti di Actions, un controllo qui costa zero).

Uso: python strumenti/serie_voce.py storyboard/<puntata>.json [--lingua=it|en] [--velocita=+15%]
"""
import asyncio
import json
import re
import sys
import unicodedata
from pathlib import Path

import edge_tts

VOCI = {"it": "it-IT-DiegoNeural", "en": "en-US-AndrewNeural"}
POSE = {"fermo", "seduto", "cammina", "zoppica", "corre", "calcia", "cade", "a_terra", "esulta", "indica", "braccia_conserte", "ride", "parla", "fissa", "lancia"}
ESPRESSIONI = {"neutra", "felice", "arrabbiata", "triste", "sorpresa", "spaventata", "sprezzante", "dolore", "determinata"}
INQUADRATURE = {"campo_largo", "piano_medio", "primo_piano", "dall_alto"}
CARTELLI = {"badge", "contatore", "tabellone", "notifica", "lavagna", "nome", "scelta"}
# folla, boato e fischi del pubblico tolti il 18/11: generati in codice suonavano come fruscio
SUONI = {"fischio", "notifica", "calcio_pallone", "whoosh", "silenzio"}
POSIZIONI = {"sinistra", "centro", "destra"}
PUBLIC = Path("public")
PUNTEGGIATURA_FINE = re.compile(r"[.,!?;:…»\"”]$")
avvisi: list[str] = []


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def pezzi_di(parola: str) -> list[str]:
    return [norm(x) for x in re.findall(r"[0-9A-Za-zÀ-ÿ]+", parola)]


def da_mostrare(parola: str) -> str:
    return re.sub(r"^[«\"“(]+|[»\"”).,;:]+$", "", parola).strip()


async def parla(testo: str, voce: str, uscita: Path, velocita: str) -> list[tuple[float, float, str]]:
    confini = []
    com = edge_tts.Communicate(testo, voce, rate=velocita, boundary="WordBoundary")
    with uscita.open("wb") as f:
        async for pezzo in com.stream():
            if pezzo["type"] == "audio":
                f.write(pezzo["data"])
            elif pezzo["type"] == "WordBoundary":
                confini.append((pezzo["offset"] / 1e7, pezzo["duration"] / 1e7, pezzo["text"]))
    return confini


def esa(c: str, riserva: str) -> str:
    return c if isinstance(c, str) and re.fullmatch(r"#[0-9A-Fa-f]{6}", c.strip()) else riserva


def stile(pg: dict) -> dict:
    testo = norm(" ".join(str(pg.get(k, "")) for k in ("aspetto", "dettaglio", "ruolo", "nome")))
    s = dict(pg.get("stile") or {})
    if "capelli" not in s:
        regole = [("rasat", "rasati"), ("ricci", "ricci"), ("ciuff", "ciuffo"), ("coda", "coda"), ("lunghi", "coda"),
                  ("calv", "calvo"), ("pelat", "calvo"), ("cappellin", "cappellino"), ("berrett", "cappellino")]
        s["capelli"] = next((v for k, v in regole if k in testo), "corti")
    if "vestito" not in s:
        if "giacca" in testo or any(k in testo for k in ("dirigent", "presiden", "procurator", "agente")):
            s["vestito"] = "giacca"
        elif any(k in testo for k in ("allenator", "mister", "tecnico")):
            s["vestito"] = "tuta"
        elif "giornalist" in testo or "camicia" in testo:
            s["vestito"] = "camicia"
        else:
            s["vestito"] = "divisa"
    if "numero" not in s:
        m = re.search(r"(?:numero|n\.|n°|maglia|col)\s*(\d{1,2})\b", testo)
        if m:
            s["numero"] = m.group(1)
    s.setdefault("fascia", "fascia" in testo or "capitano" in testo)
    s.setdefault("pettorina", "pettorina" in testo)
    s.setdefault("barba", "barba" in testo)
    s.setdefault("baffi", "baff" in testo)
    s.setdefault("occhiali", "occhial" in testo)
    if "oggetto" not in s:
        s["oggetto"] = ("microfono" if "giornalist" in testo or "microfon" in testo
                        else "cartellina" if "cartellin" in testo else "telefono" if "telefon" in testo else None)
    s.setdefault("altezza", 1.06 if re.search(r"\balt[oa]\b", testo) else 0.95 if re.search(r"\bbass[oa]\b", testo) else 1.0)
    return s


def tipo_luogo(lg: dict) -> str:
    testo = norm(f"{lg.get('id', '')} {lg.get('descrizione', '')}")
    regole = [("panchin", "panchina"), ("spogliato", "spogliatoio"), ("corridoi", "corridoio"), ("tunnel", "corridoio"),
              ("sala stampa", "sala_stampa"), ("conferenz", "sala_stampa"), ("intervist", "sala_stampa")]
    return next((v for k, v in regole if k in testo), "stadio")


def controlla(sb: dict) -> None:
    scene = sb.get("scene") or []
    if not scene:
        sys.exit("STORYBOARD NON VALIDO: nessuna scena")
    if not 6 <= len(scene) <= 14:
        avvisi.append(f"{len(scene)} scene (consigliate 8-12)")
    if len(sb.get("luoghi", [])) > 4:
        avvisi.append(f"{len(sb['luoghi'])} luoghi (massimo 4)")
    ids = {p["id"] for p in sb.get("personaggi", [])}
    luoghi = {lg["id"] for lg in sb.get("luoghi", [])}
    for s in scene:
        n = s.get("n", "?")
        if not str(s.get("voce", "")).strip():
            sys.exit(f"STORYBOARD NON VALIDO: scena {n} senza voce")
        if re.search(r"\d", s["voce"]):
            avvisi.append(f"scena {n}: cifre nella voce ({s['voce']!r}); meglio in lettere, la voce le legge male")
        if s.get("luogo") not in luoghi:
            avvisi.append(f"scena {n}: luogo {s.get('luogo')!r} non descritto")
        if s.get("inquadratura") not in INQUADRATURE:
            avvisi.append(f"scena {n}: inquadratura {s.get('inquadratura')!r} -> campo_largo")
            s["inquadratura"] = "campo_largo"
        if s.get("suono") not in SUONI:
            avvisi.append(f"scena {n}: suono {s.get('suono')!r} -> silenzio")
            s["suono"] = "silenzio"
        c = s.get("cartello")
        if c and c.get("tipo") not in CARTELLI:
            avvisi.append(f"scena {n}: cartello {c.get('tipo')!r} tolto")
            s["cartello"] = None
        elif c:
            c["testo"], c["valore"] = str(c.get("testo") or ""), str(c.get("valore") or "")
        for p in s.get("personaggi") or []:
            if p.get("id") not in ids:
                avvisi.append(f"scena {n}: personaggio {p.get('id')!r} senza scheda, tolto")
            if p.get("posa") not in POSE:
                avvisi.append(f"scena {n}: posa {p.get('posa')!r} -> fermo")
                p["posa"] = "fermo"
            if p.get("espressione") not in ESPRESSIONI:
                p["espressione"] = "neutra"
            if p.get("posizione") not in POSIZIONI:
                p["posizione"] = "centro"
        s["personaggi"] = [p for p in s.get("personaggi") or [] if p.get("id") in ids]
        chiave = norm(str(s.get("parola_chiave", "")))
        if chiave and chiave not in norm(s["voce"]):
            avvisi.append(f"scena {n}: parola chiave {s.get('parola_chiave')!r} non è nella frase")


def main(percorso: str, lingua: str, velocita: str) -> None:
    sb = json.loads(Path(percorso).read_text(encoding="utf-8"))
    controlla(sb)
    scene_in = sb["scene"]

    # parole da mostrare, con la scena di appartenenza e i loro pezzi per l'allineamento
    parole = []  # {scena, testo, toks, fine_frase}
    for si, s in enumerate(scene_in):
        for w in s["voce"].split():
            if da_mostrare(w) or pezzi_di(w):
                parole.append({"scena": si, "testo": da_mostrare(w), "toks": pezzi_di(w), "fine": bool(PUNTEGGIATURA_FINE.search(w)), "t": None})
    n_parole = sum(1 for p in parole if p["toks"])
    if not 85 <= n_parole <= 125:
        avvisi.append(f"{n_parole} parole nella voce (previste 100-115)")

    testo = " ".join(s["voce"].strip() for s in scene_in)
    PUBLIC.mkdir(exist_ok=True)
    confini = asyncio.run(parla(testo, VOCI[lingua], PUBLIC / "voce.mp3", velocita))
    if not confini:
        sys.exit("edge-tts non ha restituito i tempi delle parole")

    # allineamento: ogni confine di edge-tts si cerca nei pezzi del copione, in ordine
    pezzi = [(i, tk) for i, p in enumerate(parole) for tk in p["toks"]]
    k = 0
    for (t, _d, txt) in confini:
        for tk in pezzi_di(txt):
            for j in range(k, min(k + 5, len(pezzi))):
                if pezzi[j][1] == tk:
                    i = pezzi[j][0]
                    if parole[i]["t"] is None:
                        parole[i]["t"] = t
                    k = j + 1
                    break
    noti = [(i, p["t"]) for i, p in enumerate(parole) if p["t"] is not None]
    if len(noti) < len(parole) * 0.7:
        avvisi.append(f"allineamento debole: {len(noti)} parole su {len(parole)} ritrovate nella voce")
    for i, p in enumerate(parole):  # le parole non ritrovate (cifre, sigle) si mettono fra le vicine
        if p["t"] is None:
            prima = max(((j, t) for j, t in noti if j < i), default=(i, 0.0))
            dopo = min(((j, t) for j, t in noti if j > i), default=(i, confini[-1][0]))
            p["t"] = prima[1] + (dopo[1] - prima[1]) * ((i - prima[0]) / max(1, dopo[0] - prima[0]))
    durata = confini[-1][0] + confini[-1][1] + 1.8
    if not 25 <= durata <= 62:
        sys.exit(f"DURATA {durata:.1f} s fuori da 25-62 s: allunga o accorcia la voce")

    # scene e scritte a pezzi (al massimo 4 parole, a capo sulla punteggiatura)
    inizi = []
    for si in range(len(scene_in)):
        ws = [p for p in parole if p["scena"] == si]
        inizi.append(0.0 if si == 0 else max(0.0, (ws[0]["t"] if ws else 0) - 0.06))
    scene = []
    for si, s in enumerate(scene_in):
        da, a = inizi[si], (inizi[si + 1] if si + 1 < len(scene_in) else durata)
        chiave = set(pezzi_di(str(s.get("parola_chiave", ""))))
        gruppi, corrente = [], []
        for p in (x for x in parole if x["scena"] == si):
            corrente.append(p)
            if p["fine"] or len(corrente) == 4:
                gruppi.append(corrente)
                corrente = []
        if corrente:
            gruppi.append(corrente)
        pezzi_scena = []
        for gi, g in enumerate(gruppi):
            fine = gruppi[gi + 1][0]["t"] if gi + 1 < len(gruppi) else a
            pezzi_scena.append({"da": round(g[0]["t"], 3), "a": round(fine, 3), "parole": [
                {"w": p["testo"], "t": round(p["t"], 3), "chiave": bool(chiave and set(p["toks"]) & chiave)} for p in g]})
        c = s.get("cartello")
        scene.append({"n": s.get("n", si + 1), "da": round(da, 3), "a": round(a, 3), "luogo": s.get("luogo", ""),
                      "inquadratura": s["inquadratura"], "personaggi": s["personaggi"],
                      "cartello": ({"tipo": c["tipo"], "testo": c["testo"], "valore": c["valore"]} if c else None),
                      "suono": s["suono"], "pezzi": pezzi_scena})

    personaggi = []
    for pg in sb.get("personaggi", []):
        col = pg.get("colori") or {}
        personaggi.append({"id": pg["id"], "nome": pg.get("nome", ""), "ruolo": pg.get("ruolo", ""), "stile": stile(pg), "colori": {
            "pelle": esa(col.get("pelle"), "#C99470"), "capelli": esa(col.get("capelli"), "#2A1E17"), "maglia": esa(col.get("maglia"), "#2F5FA8"),
            "pantaloni": esa(col.get("pantaloni"), "#1F2633"), "scarpe": esa(col.get("scarpe"), "#16181C")}})
    luoghi = {}
    for lg in sb.get("luoghi", []):
        img = PUBLIC / "serie" / "sfondi" / f"{lg['id']}.jpg"
        sfocata = PUBLIC / "serie" / "sfondi" / f"{lg['id']}_sfocato.jpg"
        luoghi[lg["id"]] = {"img": f"serie/sfondi/{lg['id']}.jpg" if img.exists() else None,
                            "sfocata": f"serie/sfondi/{lg['id']}_sfocato.jpg" if sfocata.exists() else None,
                            "tipo": lg.get("tipo") or tipo_luogo(lg)}

    i_scelta = next((i for i, s in enumerate(scene) if s["cartello"] and s["cartello"]["tipo"] == "scelta"), len(scene) - 1)
    scelta = sb.get("scelta") or {}
    props = {"durata": round(durata, 3), "voce": "voce.mp3", "badge": sb.get("badge", f"GIORNO {sb.get('giorno', 1)}"),
             "personaggi": personaggi, "luoghi": luoghi, "scene": scene,
             "scelta": {"A": scelta.get("A", ""), "B": scelta.get("B", ""), "da": scene[i_scelta]["da"]}}
    (PUBLIC / "props.json").write_text(json.dumps(props, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"voce: {n_parole} parole, {durata:.1f} s, {len(scene)} scene")
    for s in scene:
        print(f"  scena {s['n']:>2}  {s['da']:5.2f}-{s['a']:5.2f}  {s['inquadratura']:<12} {len(s['pezzi'])} pezzi  "
              + " / ".join(" ".join(w["w"] for w in p["parole"]) for p in s["pezzi"]))
    for a in avvisi:
        print("AVVISO:", a)


if __name__ == "__main__":
    opzioni = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--") and "=" in a)
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    main(args[0], opzioni.get("lingua", "it"), opzioni.get("velocita", "+15%"))
