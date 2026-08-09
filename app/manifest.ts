import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Legacy OS",
    short_name: "Legacy OS",
    description:
      "A secure, evidence-led operating system for creative professionals.",
    start_url: "/",
    display: "standalone",
    background_color: "#050809",
    theme_color: "#b8792f",
    orientation: "any",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
