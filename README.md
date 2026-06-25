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
```

## Despliegue en Cloudflare Pages

El proyecto esta preparado para desplegarse como sitio estatico con
`@sveltejs/adapter-static`.

Configuracion recomendada:

```text
Framework preset: None
Build command: npm run build
Output directory: build
PUBLIC_DATA_BASE_URL=https://data.spainelectoralproject.com/spain-electoral-forecast
```

En local, `PUBLIC_DATA_BASE_URL=/data` sigue leyendo de `static/data/`.
En produccion, los Parquet, el GeoJSON y los JSON de `derived/` deben estar
publicados en R2 bajo el mismo prefijo para mantener tambien el fallback JSON.

Guia completa: [`docs/deployment-cloudflare-pages.md`](docs/deployment-cloudflare-pages.md).

## Nota sobre el mapa

`ProvinceMap` carga `provincias_spain.geojson` desde `PUBLIC_DATA_BASE_URL` y lo enriquece con la primera fuerza
provincial por porcentaje de voto. Si el GeoJSON no esta disponible, cae a una geometria
esquematica temporal.
