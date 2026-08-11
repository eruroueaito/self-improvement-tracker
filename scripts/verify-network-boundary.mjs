/**
 * 模块名称：N0 网络边界验证
 * 职责描述：静态验证可发布源码、CSP 与 Android manifest 只包含当前阶段批准的网络配置
 * 输入/输出：读取仓库文件；发现未批准远程 URL、网络 API、宽松 CSP 或 INTERNET 权限时以非零状态退出
 * 依赖关系：Node.js 标准库、当前仓库源码与 Android 构建产物
 * 注意事项：N4 引入 ProviderAdapter 时必须显式升级本脚本，不能绕过或删除门槛
 */
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.html', '.css']);
const scanRoots = ['src', 'index.html', 'capacitor.config.ts'];
const allowedUrlPrefixes = [
  'http://127.0.0.1:',
  'http://localhost:',
  'ws://127.0.0.1:',
  'ws://localhost:',
  'http://www.w3.org/2000/svg',
];
const allowedRemoteUrlsByFile = new Map([
  ['src/modules/ai/providerConfig.ts', new Set(['https://api.openai.com/v1'])],
]);
const violations = [];

const repositoryPath = (file) => relative(repositoryRoot, file).replaceAll('\\', '/');
const isTestSource = (file) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(repositoryPath(file));

const collectFiles = async (path, extensions = sourceExtensions) => {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(child, extensions));
    else if (extensions.has(extname(child))) files.push(child);
  }
  return files;
};

const productFiles = [];
for (const root of scanRoots) {
  const path = join(repositoryRoot, root);
  if (extname(path)) productFiles.push(path);
  else productFiles.push(...await collectFiles(path));
}

const releaseSourceFiles = productFiles.filter((file) => !isTestSource(file));
for (const file of releaseSourceFiles) {
  const contents = await readFile(file, 'utf8');
  const approvedRemoteUrls = allowedRemoteUrlsByFile.get(repositoryPath(file));
  const urls = contents.match(/(?:https?|wss?):\/\/[^\s"'<>]+/g) ?? [];
  for (const url of urls) {
    if (!allowedUrlPrefixes.some((prefix) => url.startsWith(prefix)) && !approvedRemoteUrls?.has(url)) {
      violations.push(`${file}: remote URL ${url}`);
    }
  }
  const networkApis = contents.match(/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b|navigator\.sendBeacon/g) ?? [];
  for (const api of networkApis) violations.push(`${file}: network API ${api}`);
}

const indexPath = join(repositoryRoot, 'index.html');
const indexContents = await readFile(indexPath, 'utf8');
const requiredCspDirectives = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "font-src 'self'",
];
for (const directive of requiredCspDirectives) {
  if (!indexContents.includes(directive)) violations.push(`${indexPath}: missing CSP directive ${directive}`);
}

const manifestCandidates = [join(repositoryRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')];
const mergedRoot = join(repositoryRoot, 'android', 'app', 'build', 'intermediates', 'merged_manifests');
try {
  manifestCandidates.push(...await collectFiles(mergedRoot, new Set(['.xml'])));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

for (const manifest of manifestCandidates) {
  const contents = await readFile(manifest, 'utf8');
  if (contents.includes('android.permission.INTERNET')) violations.push(`${manifest}: INTERNET permission is forbidden before N4`);
}

if (violations.length > 0) {
  console.error(['N0 network boundary failed:', ...violations.map((item) => `- ${item}`)].join('\n'));
  process.exit(1);
}

console.log(`N4 staged network boundary passed: ${releaseSourceFiles.length} release source files and ${manifestCandidates.length} manifest(s) checked.`);
