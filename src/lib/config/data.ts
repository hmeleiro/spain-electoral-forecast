import { env } from '$env/dynamic/public';

const DEFAULT_DATA_BASE_URL = '/data';
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

let runtimeNoCacheToken: string | null = null;
let remoteDataVersionPromise: Promise<string> | null = null;

function stripSlashes(value: string): string {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

function getRuntimeNoCacheToken(): string {
  runtimeNoCacheToken ??= Date.now().toString(36);
  return runtimeNoCacheToken;
}

function getConfiguredDataVersion(): string {
  if (TRUE_VALUES.has(env.PUBLIC_DATA_NO_CACHE?.trim().toLowerCase() ?? '')) {
    return getRuntimeNoCacheToken();
  }

  return env.PUBLIC_DATA_VERSION?.trim() ?? '';
}

async function getRemoteDataVersion(): Promise<string> {
  remoteDataVersionPromise ??= fetch(
    appendQueryParam(baseDataFileUrl('data-version.json'), 't', Date.now().toString(36)),
    { cache: 'no-store' }
  )
    .then(async (response) => {
      if (!response.ok) return '';
      const manifest = (await response.json()) as { version?: unknown };
      return typeof manifest.version === 'string' ? manifest.version.trim() : '';
    })
    .catch(() => '');

  return remoteDataVersionPromise;
}

async function getDataVersion(): Promise<string> {
  return getConfiguredDataVersion() || getRemoteDataVersion();
}

function appendQueryParam(url: string, name: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
}

export function getDataBaseUrl(): string {
  return (env.PUBLIC_DATA_BASE_URL?.trim() || DEFAULT_DATA_BASE_URL).replace(/\/+$/, '');
}

function baseDataFileUrl(fileName: string): string {
  return `${getDataBaseUrl()}/${stripSlashes(fileName)}`;
}

export async function dataFileUrl(fileName: string): Promise<string> {
  const url = baseDataFileUrl(fileName);
  const version = await getDataVersion();
  return version ? appendQueryParam(url, 'v', version) : url;
}

export async function derivedDataFileUrl(fileName: string): Promise<string> {
  return dataFileUrl(`derived/${fileName}`);
}
