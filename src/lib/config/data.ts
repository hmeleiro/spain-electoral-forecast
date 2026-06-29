import { env } from '$env/dynamic/public';

const DEFAULT_DATA_BASE_URL = '/data';
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

let runtimeNoCacheToken: string | null = null;

function stripSlashes(value: string): string {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

function getRuntimeNoCacheToken(): string {
  runtimeNoCacheToken ??= Date.now().toString(36);
  return runtimeNoCacheToken;
}

function getDataVersion(): string {
  if (TRUE_VALUES.has(env.PUBLIC_DATA_NO_CACHE?.trim().toLowerCase() ?? '')) {
    return getRuntimeNoCacheToken();
  }

  return env.PUBLIC_DATA_VERSION?.trim() ?? '';
}

function appendQueryParam(url: string, name: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
}

export function getDataBaseUrl(): string {
  return (env.PUBLIC_DATA_BASE_URL?.trim() || DEFAULT_DATA_BASE_URL).replace(/\/+$/, '');
}

export function dataFileUrl(fileName: string): string {
  const url = `${getDataBaseUrl()}/${stripSlashes(fileName)}`;
  const version = getDataVersion();
  return version ? appendQueryParam(url, 'v', version) : url;
}

export function derivedDataFileUrl(fileName: string): string {
  return dataFileUrl(`derived/${fileName}`);
}
