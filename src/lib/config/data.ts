import { env } from '$env/dynamic/public';

const DEFAULT_DATA_BASE_URL = '/data';

function stripSlashes(value: string): string {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

export function getDataBaseUrl(): string {
  return (env.PUBLIC_DATA_BASE_URL?.trim() || DEFAULT_DATA_BASE_URL).replace(/\/+$/, '');
}

export function dataFileUrl(fileName: string): string {
  return `${getDataBaseUrl()}/${stripSlashes(fileName)}`;
}

export function derivedDataFileUrl(fileName: string): string {
  return dataFileUrl(`derived/${fileName}`);
}
