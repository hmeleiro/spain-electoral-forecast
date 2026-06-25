# Spain Electoral Forecast Web

Visualizador web de estimaciones electorales basadas en outputs Parquet del pipeline CIS.

## Stack

- SvelteKit + TypeScript
- Tailwind CSS
- DuckDB-WASM para consultar Parquet en cliente
- Observable Plot para graficos
- MapLibre GL JS para mapa provincial

## Datos

Los Parquet originales permanecen en la raiz del proyecto. Para que el navegador pueda leerlos,
la primera version mantiene copias en `static/data/`:

- `estimaciones_nacionales.parquet`
- `estimaciones_provinciales.parquet`
- `simulaciones_nacionales.parquet`
- `simulaciones_provinciales.parquet`
- `provincias_spain.geojson`

La capa `src/lib/data/` normaliza los nombres reales de columnas a tipos internos antes de que
los componentes visuales reciban datos.

`static/data/derived/` contiene JSON generado desde esos Parquet. La app lo usa solo como
fallback real si DuckDB-WASM no puede abrir los Parquet en el navegador; no son datos mock.

## Desarrollo

```bash
npm install
npm run dev
```

Comprobaciones:

```bash
npm run check
npm run test
npm run build
```

Variables opcionales:

```bash
PUBLIC_DATA_BASE_URL=/data
PUBLIC_GEOJSON_PROVINCES_URL=
```

## Nota sobre el mapa

`ProvinceMap` carga `static/data/provincias_spain.geojson` y lo enriquece con la primera fuerza
provincial por porcentaje de voto. Si el GeoJSON no esta disponible, cae a una geometria
esquematica temporal.
