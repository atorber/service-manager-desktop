/**
 * 以 package.json 的 version 为唯一来源，同步到 src-tauri/Cargo.toml，
 * 便于 `cargo build` / `tauri build` 与安装包版本一致。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const v = pkg.version;
if (!v || typeof v !== 'string') {
  console.error('[sync-version] package.json 缺少有效 version');
  process.exit(1);
}

const cargoPath = join(root, 'src-tauri', 'Cargo.toml');
const cargo = readFileSync(cargoPath, 'utf-8');
const pkgVersionLine = /^version\s*=\s*"[^"]*"\s*$/m;
if (!pkgVersionLine.test(cargo)) {
  console.error('[sync-version] 未找到 [package] 下的 version = "..." 行');
  process.exit(1);
}
const next = cargo.replace(pkgVersionLine, `version = "${v}"`);
writeFileSync(cargoPath, next);
console.log('[sync-version] Cargo.toml version ->', v);
