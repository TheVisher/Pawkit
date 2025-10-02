/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      "@dnd-kit/core",
      "@dnd-kit/modifiers",
      "@dnd-kit/sortable",
      "zustand"
    ]
  }
};

module.exports = nextConfig;
