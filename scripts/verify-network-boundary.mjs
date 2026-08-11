/**
 * 模块名称：N4 网络边界验证
 * 职责描述：静态验证可发布源码、CSP 与 Android manifest 只包含当前阶段批准的网络配置
 * 输入/输出：读取仓库文件；发现未批准远程 URL/网络 API、宽松 CSP 或 Android 网络配置时以非零状态退出
 * 依赖关系：Node.js 标准库、当前仓库源码与 Android 构建产物
 * 注意事项：N4 引入 ProviderAdapter 时必须显式升级本脚本，不能绕过或删除门槛
 */
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.html', '.css']);
const scanRoots = ['src', 'index.html', 'capacitor.config.ts'];
const allowedUrlPrefixes = [
  'http://www.w3.org/2000/svg',
];
const allowedRemoteUrlsByFile = new Map([
  ['src/modules/ai/providerConfig.ts', new Set(['https://api.openai.com/v1'])],
]);
const allowedNetworkApisByFile = new Map([
  ['src/adapters/ai/openAiCompatibleProvider.ts', new Set(['fetch'])],
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
  const approvedNetworkApis = allowedNetworkApisByFile.get(repositoryPath(file));
  for (const api of networkApis) {
    if (!approvedNetworkApis?.has(api)) violations.push(`${file}: network API ${api}`);
  }
}

const indexPath = join(repositoryRoot, 'index.html');
const indexContents = await readFile(indexPath, 'utf8');
const csp = indexContents.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1] ?? '';
const requiredCspDirectives = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  'connect-src https:',
  "form-action 'self'",
];
const parsedCspDirectives = new Map();
for (const directive of csp.split(';').map((value) => value.trim()).filter(Boolean)) {
  const name = directive.split(/\s+/, 1)[0];
  if (parsedCspDirectives.has(name)) violations.push(`${indexPath}: duplicate CSP directive ${name}`);
  parsedCspDirectives.set(name, directive);
}
for (const directive of requiredCspDirectives) {
  const name = directive.split(/\s+/, 1)[0];
  if (parsedCspDirectives.get(name) !== directive) {
    violations.push(`${indexPath}: CSP directive must be exactly ${directive}`);
  }
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
  const internetPermissions = contents.match(/<uses-permission\b[^>]*android:name="android\.permission\.INTERNET"[^>]*>/g) ?? [];
  if (internetPermissions.length !== 1) {
    violations.push(`${manifest}: INTERNET permission count must be exactly 1, found ${internetPermissions.length}`);
  }
  if (!/android:allowBackup\s*=\s*"false"/.test(contents)) {
    violations.push(`${manifest}: android:allowBackup must be false`);
  }
  if (!/android:usesCleartextTraffic\s*=\s*"false"/.test(contents)) {
    violations.push(`${manifest}: android:usesCleartextTraffic must be false`);
  }
  const forbiddenNetworkPermissions = [
    'ACCESS_NETWORK_STATE',
    'CHANGE_NETWORK_STATE',
    'ACCESS_WIFI_STATE',
    'CHANGE_WIFI_STATE',
    'NEARBY_WIFI_DEVICES',
  ];
  for (const permission of forbiddenNetworkPermissions) {
    if (contents.includes(`android.permission.${permission}`)) {
      violations.push(`${manifest}: forbidden network permission ${permission}`);
    }
  }
}

if (violations.length > 0) {
  console.error(['N4 network boundary failed:', ...violations.map((item) => `- ${item}`)].join('\n'));
  process.exit(1);
}

console.log(`N4 network boundary passed: ${releaseSourceFiles.length} release source files and ${manifestCandidates.length} manifest(s) checked.`);
