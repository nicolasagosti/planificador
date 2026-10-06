import { describe, expect, it } from "vitest";
import {
  formatLabel,
  formatOnNetwork,
  networkLegend,
  networkName,
  networkShort,
  networksPhrase,
  pieceNoun,
  sortNetworks,
} from "./catalog";

describe("catalog", () => {
  it("names a piece's format and network", () => {
    expect(formatOnNetwork("reel", "instagram")).toBe("Reel en Instagram");
    expect(formatOnNetwork("story", "facebook")).toBe("Historia en Facebook");
  });

  it("uses the right article for each format", () => {
    expect(pieceNoun("post", "facebook")).toBe("el post de Facebook");
    expect(pieceNoun("story", "instagram")).toBe("la historia de Instagram");
    expect(pieceNoun("carousel", "tiktok")).toBe("el carrusel de TikTok");
  });

  it("lists networks in the catalog's order", () => {
    expect(sortNetworks(["tiktok", "instagram", "instagram"])).toEqual([
      "instagram",
      "tiktok",
    ]);
    expect(networksPhrase(["facebook", "instagram"])).toBe(
      "Instagram y Facebook",
    );
    expect(networksPhrase(["tiktok", "facebook", "instagram"])).toBe(
      "Instagram, Facebook y TikTok",
    );
  });

  it("writes the calendar legend for the networks in use", () => {
    expect(networkLegend(["facebook", "instagram"])).toBe(
      "IG es Instagram y FB es Facebook",
    );
    expect(networkLegend(["instagram", "tiktok", "facebook"])).toBe(
      "IG es Instagram, FB es Facebook y TT es TikTok",
    );
  });

  it("shows a code that is no longer in the lists as it is", () => {
    expect(networkName("mastodon")).toBe("mastodon");
    expect(networkShort("mastodon")).toBe("MASTODON");
    expect(formatLabel("podcast")).toBe("podcast");
  });
});
