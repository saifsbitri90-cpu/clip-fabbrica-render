// Formato della puntata: lo storyboard (scritto da ChatGPT o dal batch di Claude) passa da
// strumenti/serie_voce.py, che aggiunge voce, tempi di ogni parola e scritte a pezzi -> public/props.json.

export type Posa = "fermo" | "seduto" | "cammina" | "corre" | "calcia" | "cade" | "esulta" | "indica"
  | "braccia_conserte" | "ride" | "parla" | "fissa" | "lancia";
export type Espressione = "neutra" | "felice" | "arrabbiata" | "triste" | "sorpresa" | "spaventata" | "sprezzante";
export type Inquadratura = "campo_largo" | "piano_medio" | "primo_piano" | "dall_alto";
export type TipoCartello = "badge" | "contatore" | "tabellone" | "notifica" | "lavagna" | "nome" | "scelta";
export type Suono = "fischio" | "folla" | "boato" | "fischi_stadio" | "notifica" | "calcio_pallone" | "whoosh" | "silenzio";
export type Posizione = "sinistra" | "centro" | "destra";

export type Stile = {
  capelli: "corti" | "ciuffo" | "rasati" | "ricci" | "coda" | "calvo" | "cappellino";
  vestito: "divisa" | "tuta" | "camicia" | "giacca";
  numero?: string;
  fascia?: boolean;
  pettorina?: boolean;
  barba?: boolean;
  baffi?: boolean;
  occhiali?: boolean;
  oggetto?: "microfono" | "telefono" | "cartellina" | null;
  altezza?: number; // 0,9 - 1,1
};

export type Colori = { pelle: string; capelli: string; maglia: string; pantaloni: string; scarpe: string };
export type Personaggio = { id: string; nome: string; ruolo: string; colori: Colori; stile: Stile };
export type Presenza = { id: string; posa: Posa; espressione: Espressione; posizione: Posizione };
export type Cartello = { tipo: TipoCartello; testo: string; valore: string } | null;
export type Parola = { w: string; t: number; chiave: boolean };
export type Pezzo = { da: number; a: number; parole: Parola[] };
export type Scena = {
  n: number; da: number; a: number; luogo: string; inquadratura: Inquadratura;
  personaggi: Presenza[]; cartello: Cartello; suono: Suono; pezzi: Pezzo[];
};
export type Luogo = { img: string | null; tipo: string };

export type PropsPuntata = {
  durata: number;
  voce: string;
  badge: string;
  personaggi: Personaggio[];
  luoghi: Record<string, Luogo>;
  scene: Scena[];
  scelta: { A: string; B: string; da: number };
};

export const propsPuntataVuote: PropsPuntata = {
  durata: 5, voce: "", badge: "GIORNO 1", personaggi: [], luoghi: {}, scene: [], scelta: { A: "", B: "", da: 99 },
};
