import type { MetadataRoute } from "next";

// A private app: nothing is indexed.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
