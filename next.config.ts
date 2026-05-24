import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // outputFileTracingIncludes — Vercel agresivno trim-uje fajlove iz serverless
  // funkcija. Bez ovoga, public/fonts/*.ttf neće biti dostupni iz API route-a
  // koji generiše PDF, pa fs.readFileSync puca u produkciji.
  outputFileTracingIncludes: {
    "/api/reports/person/*": ["./public/fonts/**/*"],
  },
};

export default nextConfig;
