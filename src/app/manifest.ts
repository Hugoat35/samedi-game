import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Samedi — Parties",
    short_name: "Samedi",
    description: "Crée ou rejoins une partie avec un code à 4 chiffres.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f5f3ff",
    theme_color: "#7c3aed",
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
