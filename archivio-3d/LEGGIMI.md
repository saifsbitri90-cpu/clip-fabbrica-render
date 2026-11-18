# Archivio 3D (fermo dal 18/11/2026)

Saif ha bocciato il 3D il 18/11/2026 dopo la prova del personaggio Quaternius e ha scelto di fare
solo video 2D, e solo per la serie a puntate. Qui c'è tutto il lavoro 3D, tolto dal render ma non
cancellato.

| File | Cos'era | Ultimo render |
|---|---|---|
| `src/Voxel.tsx` + `storyboard/prova.json` | Claude a blocchi, monologo | 17/11 |
| `src/VoxelHD.tsx` + `storyboard/prova-hd.json` | dialogo a due voci, ombre, telecamera viva | run 44207258079 (18/11) |
| `src/Personaggio.tsx` + `modelli/` | personaggio Quaternius CC0 con ossa e animazioni vere | run 44225180530 (18/11) |

Perché è fermo: render solo su GitHub Actions senza GPU (`--gl=swangle`), 13-23 minuti per 13-20 s
di video, e un aspetto lontano dai video che Saif vuole imitare (personaggio da supereroe con vestiti
dipinti, ricci fatti di sfere, faccia senza animazione).

Per riprenderlo: rimettere i file in `src/`, `public/modelli/` e `storyboard/`, e registrare di nuovo
le composizioni in `src/Radice.tsx` (la versione di prima è nel commit 99767ac).
