import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local for local development
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use direct URL for migrations (bypasses connection pooler)
    url: process.env["DIRECT_URL"],
  },
});
