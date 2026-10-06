import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

// Variable font with the width axis: headings use font-stretch 105–112%.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "Planificador",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render every page per request: Next.js can only add the Content Security
  // Policy nonce (set in src/proxy.ts) to pages rendered at request time.
  await connection();
  return (
    <html lang="es" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
