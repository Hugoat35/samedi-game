import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  reactCompiler: true,
};

// En dev, Next 16 utilise Turbopack par défaut : ne pas envelopper avec next-pwa
// (webpack), sinon erreur « Turbopack + webpack config ». Le PWA reste actif au build.
export default process.env.NODE_ENV === "development"
  ? nextConfig
  : withPWA(nextConfig);
