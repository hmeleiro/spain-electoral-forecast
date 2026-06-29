import { browser } from '$app/environment';
import * as duckdb from '@duckdb/duckdb-wasm';
import { dataFileUrl } from '$lib/config/data';
import { SOURCE_FILES } from '$lib/data/transforms';

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;
const registeredFiles = new Map<string, Promise<void>>();

async function createDatabase(): Promise<duckdb.AsyncDuckDB> {
  if (!browser) {
    throw new Error('DuckDB-WASM solo se inicializa en el navegador.');
  }

  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' })
  );
  const worker = new Worker(workerUrl);
  const logger = new duckdb.VoidLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);

  return db;
}

async function registerParquetFile(db: duckdb.AsyncDuckDB, fileName: string): Promise<void> {
  if (!registeredFiles.has(fileName)) {
    registeredFiles.set(
      fileName,
      dataFileUrl(fileName).then((url) =>
        db.registerFileURL(fileName, url, duckdb.DuckDBDataProtocol.HTTP, false)
      )
    );
  }

  await registeredFiles.get(fileName);
}

async function getDatabase(): Promise<duckdb.AsyncDuckDB> {
  dbPromise ??= createDatabase();
  return dbPromise;
}

function rowToObject(row: unknown): Record<string, unknown> {
  if (row && typeof row === 'object' && 'toJSON' in row && typeof row.toJSON === 'function') {
    return row.toJSON() as Record<string, unknown>;
  }

  return row as Record<string, unknown>;
}

export async function queryRows<T>(sql: string): Promise<T[]> {
  const db = await getDatabase();
  await Promise.all(
    Object.values(SOURCE_FILES)
      .filter((fileName) => sql.includes(fileName))
      .map((fileName) => registerParquetFile(db, fileName))
  );
  const connection = await db.connect();

  try {
    const result = await connection.query(sql);
    return result.toArray().map((row) => rowToObject(row) as T);
  } finally {
    await connection.close();
  }
}

export function parquetPath(fileName: string): Promise<string> {
  return dataFileUrl(fileName);
}
