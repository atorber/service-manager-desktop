import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const isDryRun = process.argv.includes('--dry-run');
const VERSION_FILES = ['package.json', 'package-lock.json', 'src-tauri/Cargo.toml'];

function run(command, options = {}) {
  return execSync(command, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
    ...options,
  });
}

function runInherit(command) {
  if (isDryRun) {
    console.log(`[dry-run] ${command}`);
    return;
  }
  execSync(command, { cwd: root, stdio: 'inherit' });
}

function readVersion() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
  if (!pkg.version || typeof pkg.version !== 'string') {
    throw new Error('package.json 缺少有效 version');
  }
  return pkg.version.trim();
}

function parseSemver(version) {
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) {
    throw new Error(`当前 version 非 x.y.z 格式: ${version}`);
  }
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function bumpPatch(version) {
  const { major, minor, patch } = parseSemver(version);
  return `${major}.${minor}.${patch + 1}`;
}

function hasLocalTag(tag) {
  try {
    run(`git rev-parse -q --verify "refs/tags/${tag}"`);
    return true;
  } catch {
    return false;
  }
}

function hasRemoteTag(tag) {
  try {
    const out = run(`git ls-remote --tags origin "refs/tags/${tag}"`);
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

function tagExists(tag) {
  return hasLocalTag(tag) || hasRemoteTag(tag);
}

function setVersion(version) {
  runInherit(`npm version ${version} --no-git-tag-version`);
}

function syncVersion() {
  runInherit('npm run sync-version');
}

function ensureCleanTag(tag) {
  if (hasLocalTag(tag)) {
    throw new Error(`本地已存在同名 tag: ${tag}，请先处理后再发布`);
  }
}

function hasVersionFileChanges() {
  const out = run(`git status --porcelain -- ${VERSION_FILES.join(' ')}`);
  return out.trim().length > 0;
}

function commitAndPushVersionChanges(version) {
  if (!hasVersionFileChanges()) {
    console.log('[release] 版本文件无变更，跳过提交');
  } else {
    runInherit(`git add ${VERSION_FILES.join(' ')}`);
    runInherit(`git commit -m "chore: bump version to ${version}"`);
  }
  // Ensure remote branch contains the version state before tagging.
  runInherit('git push origin HEAD');
}

function main() {
  let version = readVersion();
  let tag = `v${version}`;

  if (tagExists(tag)) {
    console.log(`[release] 检测到 ${tag} 已存在，自动递增版本号...`);
    do {
      version = bumpPatch(version);
      tag = `v${version}`;
    } while (tagExists(tag));

    console.log(`[release] 新版本: ${version}`);
    setVersion(version);
    syncVersion();
  } else {
    console.log(`[release] ${tag} 不存在，使用当前版本发布`);
  }

  // Rule: package version update must be committed and pushed before tagging.
  commitAndPushVersionChanges(version);

  ensureCleanTag(tag);
  console.log(`[release] 创建并推送 tag: ${tag}`);
  runInherit(`git tag ${tag}`);
  runInherit(`git push origin ${tag}`);
}

try {
  main();
} catch (error) {
  console.error('[release] 失败:', error.message || String(error));
  process.exit(1);
}
