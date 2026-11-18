import { loadFont as caricaOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as caricaInter } from "@remotion/google-fonts/Inter";

// Oswald: scritte e cartelli (maiuscolo condensato, come le didascalie dei video che imitiamo).
// Inter: testi piccoli dei cartelli (notifica, ruoli).
export const OSWALD = caricaOswald("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
export const INTER = caricaInter("normal", { weights: ["500", "700", "800"], subsets: ["latin"] }).fontFamily;
