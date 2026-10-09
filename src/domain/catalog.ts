// Fixed lists of networks and formats (docs/SPEC.md, section 3). The database
// stores the codes; the interface shows the labels. Labels fall back to the
// raw code, so a code removed from these lists still displays.
import { joinWithAnd } from "./text";

export const NETWORKS = ["instagram", "facebook", "tiktok"] as const;
export type Network = (typeof NETWORKS)[number];

export const NETWORK_LABELS: Record<Network, { name: string; short: string }> =
  {
    instagram: { name: "Instagram", short: "IG" },
    facebook: { name: "Facebook", short: "FB" },
    tiktok: { name: "TikTok", short: "TT" },
  };

// "Placa" (a designed still image) came with importing calendars: it is the
// name the community manager's files use for that format.
export const FORMATS = [
  "reel",
  "story",
  "carousel",
  "post",
  "graphic",
] as const;
export type Format = (typeof FORMATS)[number];

const FORMAT_WORDS: Record<
  Format,
  { label: string; noun: string; article: "el" | "la" }
> = {
  reel: { label: "Reel", noun: "reel", article: "el" },
  story: { label: "Historia", noun: "historia", article: "la" },
  carousel: { label: "Carrusel", noun: "carrusel", article: "el" },
  post: { label: "Post", noun: "post", article: "el" },
  graphic: { label: "Placa", noun: "placa", article: "la" },
};

export const FORMAT_LABELS: Record<Format, string> = {
  reel: FORMAT_WORDS.reel.label,
  story: FORMAT_WORDS.story.label,
  carousel: FORMAT_WORDS.carousel.label,
  post: FORMAT_WORDS.post.label,
  graphic: FORMAT_WORDS.graphic.label,
};

export function isNetwork(value: string): value is Network {
  return (NETWORKS as readonly string[]).includes(value);
}

export function isFormat(value: string): value is Format {
  return (FORMATS as readonly string[]).includes(value);
}

/** "Instagram" */
export function networkName(code: string): string {
  return isNetwork(code) ? NETWORK_LABELS[code].name : code;
}

/** "IG" */
export function networkShort(code: string): string {
  return isNetwork(code) ? NETWORK_LABELS[code].short : code.toUpperCase();
}

/** "Historia" */
export function formatLabel(code: string): string {
  return isFormat(code) ? FORMAT_WORDS[code].label : code;
}

/** "Reel en Instagram" */
export function formatOnNetwork(format: string, network: string): string {
  return `${formatLabel(format)} en ${networkName(network)}`;
}

/** "el post de Facebook", "la historia de Instagram" */
export function pieceNoun(format: string, network: string): string {
  const words = isFormat(format)
    ? FORMAT_WORDS[format]
    : { noun: format, article: "el" };
  return `${words.article} ${words.noun} de ${networkName(network)}`;
}

/** Network codes in the catalog's order, without repeats. */
export function sortNetworks(codes: readonly string[]): string[] {
  const known = NETWORKS.filter((network) => codes.includes(network));
  const unknown = [...new Set(codes.filter((code) => !isNetwork(code)))];
  return [...known, ...unknown];
}

/** "Instagram y Facebook" */
export function networksPhrase(codes: readonly string[]): string {
  return joinWithAnd(sortNetworks(codes).map(networkName));
}

/** "IG es Instagram y FB es Facebook", for the calendar legend. */
export function networkLegend(codes: readonly string[]): string {
  return joinWithAnd(
    sortNetworks(codes).map(
      (code) => `${networkShort(code)} es ${networkName(code)}`,
    ),
  );
}
