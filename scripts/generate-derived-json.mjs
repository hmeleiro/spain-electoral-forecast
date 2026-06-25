import fs from 'node:fs/promises';
import path from 'node:path';
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs';

const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'static', 'data');
const derivedDir = path.join(dataDir, 'derived');
const duckdbDistDir = path.join(rootDir, 'node_modules', '@duckdb', 'duckdb-wasm', 'dist');

const bundles = {
  mvp: { mainModule: path.join(duckdbDistDir, 'duckdb-mvp.wasm') },
  eh: { mainModule: path.join(duckdbDistDir, 'duckdb-eh.wasm') }
};

const outputs = [
  {
    source: 'estimaciones_nacionales.parquet',
    target: 'estimaciones_nacionales.json',
    sql: (file) => `
      select cast(fecha as varchar) as fecha, * exclude(fecha)
      from read_parquet('${file}')
      order by fecha, partido
    `
  },
  {
    source: 'estimaciones_provinciales.parquet',
    target: 'estimaciones_provinciales.json',
    sql: (file) => `
      select cast(fecha as varchar) as fecha, * exclude(fecha)
      from read_parquet('${file}')
      order by fecha, codigo_provincia, partido
    `
  },
  {
    source: 'simulaciones_nacionales.parquet',
    target: 'simulaciones_nacionales_latest.json',
    sql: (file) => `
      select cast(fecha as varchar) as fecha, * exclude(fecha)
      from read_parquet('${file}')
      where fecha = (select max(fecha) from read_parquet('${file}'))
      order by sim, partido
    `
  },
  {
    source: 'escenarios_nacionales.parquet',
    target: 'escenarios_nacionales.json',
    optional: true,
    sql: (file) => `
      select cast(fecha as varchar) as fecha, * exclude(fecha)
      from read_parquet('${file}')
      order by fecha, scenario_id
    `
  },
  {
    source: 'first_force_probability.parquet',
    target: 'first_force_probability.json',
    optional: true,
    sql: (file) => `
      select cast(fecha as varchar) as fecha, * exclude(fecha)
      from read_parquet('${file}')
      order by fecha, rank, partido
    `
  },
  {
    source: 'results_prev.parquet',
    target: 'results_prev.json',
    optional: true,
    sql: (file) => `
      select partido, votos, pct, diputados
      from read_parquet('${file}')
      order by votos desc nulls last, diputados desc nulls last
    `
  },
  {
    source: 'results_prev_prov.parquet',
    target: 'results_prev_prov.json',
    optional: true,
    sql: (file) => `
      select codigo_provincia, partido, votos, pct, diputados
      from read_parquet('${file}')
      order by codigo_provincia, votos desc nulls last, diputados desc nulls last
    `
  }
];

const db = await duckdb.createDuckDB(bundles, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
await db.instantiate(() => {});
const connection = db.connect();

try {
  await fs.mkdir(derivedDir, { recursive: true });

  for (const output of outputs) {
    const sourcePath = path.join(dataDir, output.source);
    const targetPath = path.join(derivedDir, output.target);

    if (!(await exists(sourcePath))) {
      if (output.optional) {
        console.warn(`Skipping optional source: ${output.source}`);
        continue;
      }

      throw new Error(`Missing required source: ${sourcePath}`);
    }

    const rows = queryRows(output.sql(toSqlPath(sourcePath)));
    await fs.writeFile(targetPath, `${JSON.stringify(rows, jsonReplacer, 2)}\n`);
    console.log(`Wrote ${path.relative(rootDir, targetPath)} (${rows.length} rows)`);
  }
} finally {
  connection.close();
}

function queryRows(sql) {
  const result = connection.query(sql);
  return result.toArray().map((row) => rowToPlainObject(row.toJSON()));
}

function rowToPlainObject(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, normalizeJsonValue(value)])
  );
}

function normalizeJsonValue(value) {
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

function jsonReplacer(_key, value) {
  return normalizeJsonValue(value);
}

function toSqlPath(filePath) {
  return filePath.replaceAll('\\', '/').replaceAll("'", "''");
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
