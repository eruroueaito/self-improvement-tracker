/**
 * 模块名称：N0 Android 环境验证
 * 职责描述：确定性检查 Node、npm、JDK、Android SDK 与 Gradle 的固定版本证据
 * 输入/输出：读取进程版本和 SDK 文件；任一必需版本不匹配时以非零状态退出
 * 依赖关系：Node.js 标准库、JAVA_HOME、ANDROID_SDK_ROOT/ANDROID_HOME、Gradle wrapper
 * 注意事项：只验证环境，不下载工具、不修改用户全局配置
 */
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const expected = {
  node: 'v24.14.0',
  npm: '11.12.1',
  java: '21.0.6',
  javaBuild: process.platform === 'win32' ? '21.0.6+8-LTS-188' : '21.0.6+7',
  platformTools: '37.0.1',
  gradle: '8.14.3',
};
const failures = [];
const repositoryRoot = resolve(import.meta.dirname, '..');
const sdkRoot = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;

const requireFile = async (path, label) => {
  try {
    await access(path, constants.F_OK);
  } catch {
    failures.push(`${label} missing: ${path}`);
  }
};

if (process.version !== expected.node) failures.push(`Node expected ${expected.node}, received ${process.version}`);
const npmVersion = (process.env.npm_config_user_agent?.match(/^npm\/([^ ]+)/)?.[1] ?? '').trim();
if (npmVersion !== expected.npm) failures.push(`npm expected ${expected.npm}, received ${npmVersion || 'unknown; run through npm'}`);

const javaResult = spawnSync('java', ['-version'], { encoding: 'utf8' });
const javaOutput = `${javaResult.stdout ?? ''}${javaResult.stderr ?? ''}`;
if (javaResult.status !== 0 || !javaOutput.includes(expected.javaBuild)) failures.push(`JDK expected build ${expected.javaBuild}; received ${javaOutput.trim() || 'unavailable'}`);

if (!sdkRoot) {
  failures.push('ANDROID_SDK_ROOT or ANDROID_HOME is required');
} else {
  const executable = (name) => `${name}${process.platform === 'win32' ? '.exe' : ''}`;
  await requireFile(join(sdkRoot, 'cmdline-tools', 'latest', 'bin', process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager'), 'sdkmanager');
  await requireFile(join(sdkRoot, 'platforms', 'android-36', 'android.jar'), 'SDK Platform 36');
  await requireFile(join(sdkRoot, 'build-tools', '35.0.0', executable('aapt2')), 'Build Tools 35.0.0');
  const adbPath = join(sdkRoot, 'platform-tools', executable('adb'));
  await requireFile(adbPath, 'platform-tools');
  const adbResult = spawnSync(adbPath, ['version'], { encoding: 'utf8' });
  const adbOutput = `${adbResult.stdout ?? ''}${adbResult.stderr ?? ''}`;
  if (adbResult.status !== 0 || !adbOutput.includes(`Version ${expected.platformTools}-`)) {
    failures.push(`Platform Tools expected ${expected.platformTools}; received ${adbOutput.trim() || 'unavailable'}`);
  }
}

const localGradle = join(repositoryRoot, '.tools', 'gradle', 'gradle-8.14.3', 'bin', process.platform === 'win32' ? 'gradle.bat' : 'gradle');
const localGradleLauncher = join(repositoryRoot, '.tools', 'gradle', 'gradle-8.14.3', 'lib', 'gradle-launcher-8.14.3.jar');
let gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
let gradleCwd = join(repositoryRoot, 'android');
let gradleArgs = ['--version'];
try {
  await access(localGradle, constants.F_OK);
  await access(localGradleLauncher, constants.F_OK);
  gradleCommand = 'java';
  gradleArgs = ['-classpath', localGradleLauncher, 'org.gradle.launcher.GradleMain', '--version'];
} catch {
  // CI intentionally exercises the checked-in wrapper; local Windows builds may use the separately hash-verified distribution.
}
const gradleResult = spawnSync(gradleCommand, gradleArgs, {
  cwd: gradleCwd,
  encoding: 'utf8',
});
const gradleOutput = `${gradleResult.stdout ?? ''}${gradleResult.stderr ?? ''}`;
if (gradleResult.status !== 0 || !gradleOutput.includes(`Gradle ${expected.gradle}`)) {
  failures.push(`Gradle expected ${expected.gradle}; received ${gradleOutput.trim() || 'unavailable'}`);
}

const wrapperProperties = await readFile(join(repositoryRoot, 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties'), 'utf8');
if (!wrapperProperties.includes('distributionSha256Sum=ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c')) {
  failures.push('Gradle wrapper SHA-256 pin is missing');
}

if (failures.length > 0) {
  console.error(['N0 environment verification failed:', ...failures.map((item) => `- ${item}`)].join('\n'));
  process.exit(1);
}

console.log(`N0 environment passed: Node ${process.version}, npm ${npmVersion}, JDK ${expected.javaBuild}, SDK 36, Build Tools 35.0.0, Platform Tools ${expected.platformTools}, Gradle ${expected.gradle}.`);
