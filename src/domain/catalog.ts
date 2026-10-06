// Fixed lists of networks and formats (docs/SPEC.md, section 3). The database
// stores the codes; the interface shows the labels.

export const NETWORKS = ["instagram", "facebook", "tiktok"] as const;
export type Network = (typeof NETWORKS)[number];

export const NETWORK_LABELS: Record<Network, { name: string; short: string }> =
  {
    instagram: { name: "Instagram", short: "IG" },
    facebook: { name: "Facebook", short: "FB" },
    tiktok: { name: "TikTok", short: "TT" },
  };

export const FORMATS = ["reel", "story", "carousel", "post"] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<Format, string> = {
  reel: "Reel",
  story: "Historia",
  carousel: "Carrusel",
  post: "Post",
};

export function isNetwork(value: string): value is Network {
  return (NETWORKS as readonly string[]).includes(value);
}

export function isFormat(value: string): value is Format {
  return (FORMATS as readonly string[]).includes(value);
}
