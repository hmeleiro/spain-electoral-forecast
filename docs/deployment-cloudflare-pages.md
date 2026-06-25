# Despliegue en Cloudflare Pages

Esta fase despliega la web como sitio estatico en Cloudflare Pages. No hay API,
FastAPI, servidor Node.js en produccion ni bindings de Cloudflare Workers.

## Configuracion de Cloudflare Pages

Conecta el repositorio `hmeleiro/spain-electoral-forecast` desde Cloudflare:

1. Entra en Cloudflare Dashboard.
2. Ve a Workers & Pages.
3. Selecciona Create application > Pages > Connect to Git.
4. Autoriza GitHub y elige el repositorio.
5. Selecciona la rama de produccion.
6. Usa esta configuracion:

```text
Framework preset: None
Build command: npm run build
Output directory: build
Root directory: /
```

Tambien puedes elegir el preset SvelteKit, pero en esta configuracion estatica
debes sobrescribir el output directory a `build`. El preset de SvelteKit de
Cloudflare suele asumir una salida para `adapter-cloudflare`.

## Variables de entorno

Para produccion en Cloudflare Pages, configura:

```env
PUBLIC_DATA_BASE_URL=https://data.spainelectoralproject.com/spain-electoral-forecast
```

Para desarrollo local, el valor por defecto sigue siendo:

```env
PUBLIC_DATA_BASE_URL=/data
```

En el despliegue estatico, Cloudflare Pages inyecta esta variable durante el
build y SvelteKit la publica para el cliente. Se usa como base para todos los
datos:

- Parquet
- `provincias_spain.geojson`
- JSON derivados bajo `derived/`

## Datos en R2

Para que la aplicacion lea desde R2, publica estos objetos bajo el prefijo
`spain-electoral-forecast/` del dominio de datos:

```text
estimaciones_nacionales.parquet
estimaciones_provinciales.parquet
provincias_spain.geojson
results_prev.parquet
results_prev_prov.parquet
simulaciones_nacionales.parquet
derived/estimaciones_nacionales.json
derived/estimaciones_provinciales.json
derived/simulaciones_nacionales_latest.json
```

Los JSON de `derived` no son obligatorios para el camino principal, pero si deben
estar en R2 si quieres conservar el fallback real cuando DuckDB-WASM o la lectura
de Parquet falle. Si no estan, la app caera al ultimo fallback mock en las vistas
que lo tengan definido.

Asegura que el bucket o dominio publico de R2 permite peticiones `GET` desde el
dominio de la web. Para el MVP basta con servir ficheros estaticos publicos desde
el dominio `data.spainelectoralproject.com`.

## Dominio personalizado

Para anadir un dominio a la web:

1. En Cloudflare Dashboard, abre Workers & Pages.
2. Selecciona el proyecto de Pages.
3. Ve a Custom domains.
4. Selecciona Set up a domain.
5. Introduce el dominio o subdominio.
6. Sigue la configuracion DNS propuesta por Cloudflare.

Si usas un dominio apex, la zona debe estar en Cloudflare. Para un subdominio,
Cloudflare puede crear o indicar el CNAME necesario.

## Por que no adapter-cloudflare

`adapter-cloudflare` es util cuando SvelteKit necesita SSR, endpoints, acciones de
formulario, bindings o acceso a APIs de Cloudflare en runtime. Esta primera fase
solo necesita HTML, CSS, JS y ficheros de datos estaticos. Por eso se usa
`@sveltejs/adapter-static`, que genera la carpeta `build/` y evita mantener Node.js
en produccion.

Fuentes oficiales:

- SvelteKit adapter-static: https://svelte.dev/docs/kit/adapter-static
- Cloudflare Pages build configuration: https://developers.cloudflare.com/pages/configuration/build-configuration/
- Cloudflare Pages custom domains: https://developers.cloudflare.com/pages/configuration/custom-domains/
- Cloudflare R2 public buckets: https://developers.cloudflare.com/r2/buckets/public-buckets/
