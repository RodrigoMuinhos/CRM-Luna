import { spawn } from 'node:child_process';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_TEF_BRIDGE_URL = 'http://127.0.0.1:7071';

export type ServiceControlStatus = {
  ok: boolean;
  supported: boolean;
  running: boolean;
  managedProcess?: boolean;
  pid?: number | null;
  healthReachable?: boolean;
  url?: string;
  healthUrl?: string;
  skipByEnv?: boolean;
  autostart?: {
    enabled?: boolean;
    delayMs?: number;
    scheduledAt?: string | null;
  } | null;
  lastStartAt?: string | null;
  lastStopAt?: string | null;
  lastError?: string | null;
  error?: string;
};

type ServiceControlOverrides = {
  sitefStoreCode?: string;
};

type StartServiceOptions = {
  forceRestart?: boolean;
  storeCode?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getBridgeBaseUrl(): string {
  const server = (process.env.TEF_BRIDGE_URL || '').trim();
  const sitef = (process.env.SITEF_BRIDGE_URL || '').trim();
  const pub = (process.env.NEXT_PUBLIC_TEF_BRIDGE_URL || '').trim();
  return (server || sitef || pub || DEFAULT_TEF_BRIDGE_URL).replace(/\/+$/, '');
}

export function getBridgeHealthUrl(): string {
  return `${getBridgeBaseUrl()}/api/health`;
}

export async function isBridgeHealthy(timeoutMs = 1500): Promise<boolean> {
  const healthUrl = getBridgeHealthUrl();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(healthUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: ctrl.signal,
    });
    return resp.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function waitBridgeHealth(targetHealthy: boolean, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const healthy = await isBridgeHealthy(1200);
    if (healthy === targetHealthy) return true;
    await sleep(400);
  }
  return false;
}

async function fileExists(filename: string): Promise<boolean> {
  try {
    await fs.access(filename);
    return true;
  } catch {
    return false;
  }
}

function uniqueStrings(values: string[]): string[] {
  const set = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const v = String(value || '').trim();
    if (!v || set.has(v)) continue;
    set.add(v);
    out.push(v);
  }
  return out;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const raw = String(value || '').trim();
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeStoreCode(raw: string | null | undefined): string {
  const cleaned = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  return cleaned;
}

function getOverridesFilePath(): string {
  const localAppData = String(process.env.LOCALAPPDATA || '').trim();
  if (localAppData) {
    return path.join(localAppData, 'LunaKiosk', 'tef-service.overrides.json');
  }
  return path.join(os.homedir(), 'AppData', 'Local', 'LunaKiosk', 'tef-service.overrides.json');
}

async function readOverrides(): Promise<ServiceControlOverrides> {
  const filename = getOverridesFilePath();
  try {
    const raw = await fs.readFile(filename, 'utf8');
    const json = JSON.parse(raw || '{}') as ServiceControlOverrides;
    return {
      sitefStoreCode: normalizeStoreCode(json?.sitefStoreCode),
    };
  } catch {
    return {};
  }
}

async function writeOverrides(overrides: ServiceControlOverrides): Promise<void> {
  const filename = getOverridesFilePath();
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(
    filename,
    JSON.stringify(
      {
        sitefStoreCode: normalizeStoreCode(overrides?.sitefStoreCode),
      },
      null,
      2
    ),
    'utf8'
  );
}

export async function getConfiguredStoreCode(): Promise<string> {
  const overrides = await readOverrides();
  return normalizeStoreCode(overrides.sitefStoreCode);
}

export async function setConfiguredStoreCode(storeCode: string): Promise<string> {
  const normalized = normalizeStoreCode(storeCode);
  await writeOverrides({ sitefStoreCode: normalized });
  return normalized;
}

function repoRootCandidates(): string[] {
  const cwd = process.cwd();
  return uniqueStrings([
    cwd,
    path.resolve(cwd, '..'),
    path.resolve(cwd, '../..'),
    path.resolve(cwd, '../../..'),
    path.resolve(cwd, '../../../..'),
  ]);
}

async function resolveStartTarget(forceRestart = false): Promise<{ type: 'script' | 'exe'; path: string; args: string[] } | null> {
  const configuredScript = String(
    process.env.TEF_SERVICE_START_SCRIPT ||
      process.env.SITEF_SERVICE_START_SCRIPT ||
      ''
  ).trim();
  if (configuredScript) {
    return { type: 'script', path: configuredScript, args: [] };
  }

  const roots = repoRootCandidates();
  const scriptCandidates = roots.flatMap((root) => {
    const startScript = path.join(root, 'START-SITEF-BRIDGE.ps1');
    const restartScript = path.join(root, 'scripts-powershell', 'restart-sitef-bridge.ps1');
    const runScript = path.join(root, 'projeto-Luna.code-workspace', 'LunaKiosk', 'sitef-bridge', 'scripts', 'run-sitef-bridge.ps1');
    const oneClick = path.join(root, 'START-SITEF-BRIDGE-ONECLICK.bat');

    // Always prefer canonical START script for both start/restart flows.
    // startService(forceRestart=true) already performs process kill before spawning.
    return [startScript, restartScript, runScript, oneClick];
  });

  for (const script of uniqueStrings(scriptCandidates)) {
    if (await fileExists(script)) {
      return { type: 'script', path: script, args: [] };
    }
  }

  const exeCandidates = roots.flatMap((root) => [
    path.join(root, 'sitef-bridge-published', 'sitef-bridge.exe'),
    path.join(root, 'projeto-Luna.code-workspace', 'LunaKiosk', 'sitef-bridge', 'sitef-bridge-published', 'sitef-bridge.exe'),
    path.join(root, 'projeto-Luna.code-workspace', 'LunaKiosk', 'kiosk-electron', 'resources', 'sitef-bridge', 'sitef-bridge.exe'),
  ]);

  for (const exe of uniqueStrings(exeCandidates)) {
    if (await fileExists(exe)) {
      return { type: 'exe', path: exe, args: [] };
    }
  }

  return null;
}

function spawnDetachedWindowsScript(scriptPath: string, args: string[] = []) {
  const ext = path.extname(scriptPath).toLowerCase();
  const systemRoot = String(process.env.SystemRoot || 'C:\\Windows').trim() || 'C:\\Windows';
  const cmdExeCandidate = path.join(systemRoot, 'System32', 'cmd.exe');
  const cmdExe = fsSync.existsSync(cmdExeCandidate) ? cmdExeCandidate : 'cmd.exe';
  const psExeCandidate = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const psExe = fsSync.existsSync(psExeCandidate) ? psExeCandidate : 'powershell';

  if (ext === '.bat' || ext === '.cmd') {
    const child = spawn(cmdExe, ['/d', '/s', '/c', `"${scriptPath}"`], {
      cwd: path.dirname(scriptPath),
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    return;
  }

  if (ext === '.ps1') {
    const child = spawn(
      psExe,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args],
      {
        cwd: path.dirname(scriptPath),
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      }
    );
    child.unref();
    return;
  }

  const child = spawn(scriptPath, args, {
    cwd: path.dirname(scriptPath),
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

function appendTail(current: string, nextChunk: Buffer | string, max = 4096): string {
  const joined = `${current}${String(nextChunk || '')}`;
  if (joined.length <= max) return joined;
  return joined.slice(joined.length - max);
}

async function runWindowsScript(scriptPath: string, args: string[] = [], timeoutMs = 180_000): Promise<{
  ok: boolean;
  exitCode: number | null;
  stdoutTail: string;
  stderrTail: string;
  error?: string;
}> {
  const ext = path.extname(scriptPath).toLowerCase();
  const systemRoot = String(process.env.SystemRoot || 'C:\\Windows').trim() || 'C:\\Windows';
  const cmdExeCandidate = path.join(systemRoot, 'System32', 'cmd.exe');
  const cmdExe = fsSync.existsSync(cmdExeCandidate) ? cmdExeCandidate : 'cmd.exe';
  const psExeCandidate = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const psExe = fsSync.existsSync(psExeCandidate) ? psExeCandidate : 'powershell';

  const command = ext === '.ps1' ? psExe : ext === '.bat' || ext === '.cmd' ? cmdExe : scriptPath;
  const commandArgs =
    ext === '.ps1'
      ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args]
      : ext === '.bat' || ext === '.cmd'
        ? ['/d', '/s', '/c', `"${scriptPath}"`]
        : args;

  return new Promise((resolve) => {
    let stdoutTail = '';
    let stderrTail = '';
    let settled = false;
    let timedOut = false;
    const child = spawn(command, commandArgs, {
      cwd: path.dirname(scriptPath),
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const finish = (result: { ok: boolean; exitCode: number | null; stdoutTail: string; stderrTail: string; error?: string }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill();
      } catch {
        // ignore
      }
      finish({
        ok: false,
        exitCode: null,
        stdoutTail,
        stderrTail,
        error: 'script_timeout',
      });
    }, Math.max(10_000, timeoutMs));

    child.stdout?.on('data', (chunk) => {
      stdoutTail = appendTail(stdoutTail, chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderrTail = appendTail(stderrTail, chunk);
    });

    child.on('error', (err: any) => {
      clearTimeout(timer);
      finish({
        ok: false,
        exitCode: null,
        stdoutTail,
        stderrTail,
        error: String(err?.message || 'script_spawn_error'),
      });
    });

    child.on('exit', (code) => {
      if (timedOut) return;
      clearTimeout(timer);
      finish({
        ok: code === 0,
        exitCode: code,
        stdoutTail,
        stderrTail,
        error: code === 0 ? undefined : `script_exit_${String(code)}`,
      });
    });
  });
}

async function resolveNativeConfigArgs(): Promise<string[]> {
  const roots = repoRootCandidates();
  for (const root of roots) {
    const nativeDir = path.join(root, 'Config');
    const iniPath = path.join(nativeDir, 'clisitef.ini');
    if (await fileExists(iniPath)) {
      return ['-NativeDir', nativeDir, '-IniPath', iniPath, '-PinPadPort', 'AUTO_USB', '-ForcePinPadPort'];
    }
  }
  return [];
}

async function buildScriptArgs(scriptPath: string, storeCode: string): Promise<string[]> {
  const name = path.basename(scriptPath).toLowerCase();
  const args: string[] = [];

  // Keep defaults aligned with homologation workflow used in this workspace.
  if (name === 'restart-sitef-bridge.ps1' || name === 'start-sitef-bridge.ps1') {
    args.push('-Mode', 'SIM_LOCAL', '-KillIfPortBusy');
    args.push(...(await resolveNativeConfigArgs()));
    if (storeCode) {
      args.push('-SitefStoreCode', storeCode);
    }
  }

  return args;
}

async function runStopCommandWindows(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('taskkill', ['/im', 'sitef-bridge.exe', '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('exit', () => resolve());
  });
}

export async function getServiceStatus(): Promise<ServiceControlStatus> {
  const url = getBridgeBaseUrl();
  const healthUrl = getBridgeHealthUrl();
  const healthReachable = await isBridgeHealthy();
  return {
    ok: true,
    supported: true,
    running: healthReachable,
    managedProcess: false,
    pid: null,
    healthReachable,
    url,
    healthUrl,
    skipByEnv: false,
    autostart: null,
    lastStartAt: null,
    lastStopAt: null,
    lastError: null,
  };
}

export async function startService(options: StartServiceOptions = {}): Promise<ServiceControlStatus> {
  const forceRestart = Boolean(options.forceRestart);
  const configuredStoreCode = normalizeStoreCode(options.storeCode || (await getConfiguredStoreCode()));
  const alreadyHealthy = await isBridgeHealthy();
  if (alreadyHealthy && !forceRestart) {
    return getServiceStatus();
  }

  if (process.platform !== 'win32') {
    return {
      ok: false,
      supported: false,
      running: false,
      error: 'service_control_supported_only_on_windows',
      url: getBridgeBaseUrl(),
      healthUrl: getBridgeHealthUrl(),
    };
  }

  const target = await resolveStartTarget(forceRestart);
  if (!target) {
    return {
      ok: false,
      supported: true,
      running: false,
      error: 'sitef_start_target_not_found',
      url: getBridgeBaseUrl(),
      healthUrl: getBridgeHealthUrl(),
    };
  }

  try {
    if (forceRestart && alreadyHealthy) {
      await runStopCommandWindows();
      await waitBridgeHealth(false, 12_000);
      await sleep(500);
    }

    if (target.type === 'script') {
      const scriptArgs = await buildScriptArgs(target.path, configuredStoreCode);
      const ext = path.extname(target.path).toLowerCase();
      if (ext === '.ps1') {
        const scriptTimeoutMs = parsePositiveInt(
          process.env.TEF_SERVICE_SCRIPT_TIMEOUT_MS || process.env.SITEF_SERVICE_SCRIPT_TIMEOUT_MS,
          180_000
        );
        const run = await runWindowsScript(target.path, scriptArgs, scriptTimeoutMs);
        if (!run.ok) {
          const detail = run.error || (run.exitCode !== null ? `exit_${run.exitCode}` : 'script_failed');
          const tail = (run.stderrTail || run.stdoutTail || '').trim();
          return {
            ok: false,
            supported: true,
            running: false,
            error: tail ? `sitef_start_script_failed:${detail}:${tail}` : `sitef_start_script_failed:${detail}`,
            url: getBridgeBaseUrl(),
            healthUrl: getBridgeHealthUrl(),
          };
        }
      } else {
        spawnDetachedWindowsScript(target.path, scriptArgs);
      }
    } else {
      const child = spawn(target.path, target.args, {
        cwd: path.dirname(target.path),
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();
    }
  } catch (e: any) {
    return {
      ok: false,
      supported: true,
      running: false,
      error: String(e?.message || 'sitef_start_spawn_failed'),
      url: getBridgeBaseUrl(),
      healthUrl: getBridgeHealthUrl(),
    };
  }

  const startTimeoutMs = parsePositiveInt(
    process.env.TEF_SERVICE_START_TIMEOUT_MS || process.env.SITEF_SERVICE_START_TIMEOUT_MS,
    75_000
  );
  const healthy = await waitBridgeHealth(true, startTimeoutMs);
  if (!healthy) {
    // Defensive re-check: in slower machines the process can become healthy right
    // after timeout, causing a false negative in the UI.
    await sleep(1200);
    if (await isBridgeHealthy(1500)) {
      return getServiceStatus();
    }
    return {
      ok: false,
      supported: true,
      running: false,
      error: 'sitef_start_timeout_waiting_health',
      url: getBridgeBaseUrl(),
      healthUrl: getBridgeHealthUrl(),
    };
  }

  return getServiceStatus();
}

export async function stopService(): Promise<ServiceControlStatus> {
  const alreadyHealthy = await isBridgeHealthy();
  if (!alreadyHealthy) {
    const status = await getServiceStatus();
    return {
      ...status,
      ok: true,
      running: false,
      error: undefined,
    };
  }

  if (process.platform !== 'win32') {
    return {
      ok: false,
      supported: false,
      running: true,
      error: 'service_control_supported_only_on_windows',
      url: getBridgeBaseUrl(),
      healthUrl: getBridgeHealthUrl(),
    };
  }

  try {
    await runStopCommandWindows();
  } catch (e: any) {
    return {
      ok: false,
      supported: true,
      running: true,
      error: String(e?.message || 'sitef_stop_failed'),
      url: getBridgeBaseUrl(),
      healthUrl: getBridgeHealthUrl(),
    };
  }

  const down = await waitBridgeHealth(false, 12_000);
  const status = await getServiceStatus();
  return {
    ...status,
    ok: down && !status.running,
    error: down ? undefined : 'sitef_stop_timeout_waiting_down',
  };
}

export async function restartService(options: StartServiceOptions = {}): Promise<ServiceControlStatus> {
  return startService({
    ...options,
    forceRestart: true,
  });
}

export function validateServiceControlPassword(password: string): { ok: boolean; error?: string } {
  const expected = String(
    process.env.SITEF_SERVICE_CONTROL_PASSWORD ||
      process.env.TEF_SERVICE_CONTROL_PASSWORD ||
      ''
  ).trim();

  // If no control password is configured in environment, allow start/stop without prompt.
  if (!expected) {
    return { ok: true };
  }

  const pwd = String(password || '').trim();
  if (!pwd) {
    return { ok: false, error: 'password_required' };
  }

  if (expected && pwd !== expected) {
    return { ok: false, error: 'invalid_password' };
  }

  return { ok: true };
}
