#!/usr/bin/env node

/**
 * Build script for copying Next.js standalone output to Tauri resources
 *
 * This script:
 * 1. Builds the Next.js app with standalone output
 * 2. Copies the standalone folder to packages/desktop/standalone
 * 3. Copies static assets alongside the server
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../../..");
const DESKTOP_DIR = path.resolve(__dirname, "..");
const NEXTJS_STANDALONE = path.join(ROOT_DIR, ".next/standalone");
const NEXTJS_STATIC = path.join(ROOT_DIR, ".next/static");
const NEXTJS_PUBLIC = path.join(ROOT_DIR, "public");
const TARGET_DIR = path.join(DESKTOP_DIR, "standalone");

function log(message) {
  console.log(`[build-standalone] ${message}`);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    log(`Warning: Source does not exist: ${src}`);
    return;
  }

  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function clean() {
  log("Cleaning previous build...");
  if (fs.existsSync(TARGET_DIR)) {
    fs.rmSync(TARGET_DIR, { recursive: true, force: true });
  }
}

function buildNextjs() {
  log("Building Next.js with standalone output...");

  const result = spawnSync("pnpm", ["build"], {
    cwd: ROOT_DIR,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(`Next.js build failed with exit code ${result.status}`);
  }
}

function copyStandalone() {
  log("Copying standalone build...");

  if (!fs.existsSync(NEXTJS_STANDALONE)) {
    throw new Error(
      `Standalone build not found at ${NEXTJS_STANDALONE}. ` +
        'Make sure next.config.ts has output: "standalone"'
    );
  }

  // Copy the standalone server
  copyRecursive(NEXTJS_STANDALONE, TARGET_DIR);

  // Copy static files to .next/static within standalone
  const staticDest = path.join(TARGET_DIR, ".next/static");
  log("Copying static assets...");
  copyRecursive(NEXTJS_STATIC, staticDest);

  // Copy public folder
  const publicDest = path.join(TARGET_DIR, "public");
  if (fs.existsSync(NEXTJS_PUBLIC)) {
    log("Copying public assets...");
    copyRecursive(NEXTJS_PUBLIC, publicDest);
  }
}

function main() {
  try {
    log("Starting standalone build process...");

    clean();
    buildNextjs();
    copyStandalone();

    log("Standalone build complete!");
    log(`Output: ${TARGET_DIR}`);
  } catch (error) {
    console.error("Build failed:", error.message);
    process.exit(1);
  }
}

main();
