import { existsSync, mkdirSync, cpSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const distDir = resolve(projectRoot, "dist");
const targetDir = resolve(projectRoot, "..", "desktop");

if (!existsSync(distDir)) {
  console.error("dist folder not found. Run the build first.");
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });
cpSync(distDir, targetDir, { recursive: true });

console.log(`Copied dist to ${targetDir}`);
