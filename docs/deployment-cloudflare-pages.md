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
PUBLIC_DATA_VERSION=
PUBLIC_DATA_NO_CACHE=false
```

Para desarrollo local, el valor por defecto sigue siendo:

```env
PUBLIC_DATA_BASE_URL=/data
PUBLIC_DATA_VERSION=
PUBLIC_DATA_NO_CACHE=false
```

En el despliegue estatico, Cloudflare Pages inyecta esta variable durante el
build y SvelteKit la publica para el cliente. Se usa como base para todos los
datos:

- Parquet
- `provincias_spain.geojson`
- `data-version.json`
- JSON derivados bajo `derived/`

## Cache de datos

La aplicacion intenta leer `data-version.json` desde el mismo prefijo de datos
antes de cargar Parquet, GeoJSON o JSON derivados. Ese manifest se pide con
`cache: no-store` y con un query string temporal para evitar caches intermedios.

Ejemplo:

```json
{
  "version": "2026-06-29-1"
}
```

Con ese manifest, la web leera:

```text
https://data.spainelectoralproject.com/spain-electoral-forecast/estimaciones_nacionales.parquet?v=2026-06-29-1
```

Flujo recomendado al actualizar datos:

```text
1. Regenera/sube los Parquet, JSON derivados y GeoJSON a R2.
2. Sube data-version.json con una version nueva.
3. No cambies variables de Pages ni redepliegues la web.
```

`PUBLIC_DATA_VERSION` queda como override manual opcional. Si tiene valor, la app
lo usa antes que `data-version.json`. Puede ser util para probar o forzar una
version concreta desde el build de Pages, pero no es el camino recomendado para
actualizaciones ordinarias de datos.

Si prefieres priorizar siempre la frescura de datos, configura:

```env
PUBLIC_DATA_NO_CACHE=true
```

Con ese modo, cada carga de la app genera un `?v=...` nuevo para los ficheros de
datos. Es lo mas robusto contra cache, pero puede aumentar trafico y latencia
porque los Parquet no se reaprovechan tan bien desde CDN.

Recomendacion adicional en Cloudflare: asegura que la cache key del dominio
de datos respeta el query string. Si aplicas reglas de cache propias, no ignores
`?v=...` para el prefijo de datos.

Puedes configurar `Cache-Control: no-cache, max-age=0` o una Cache Rule
equivalente solo para `data-version.json` si quieres reforzar la revalidacion del
manifest. Evita aplicar esta politica a los assets de Pages (`.js`, `.css`,
imagenes de la app), que si deben mantener cache largo.


## Datos en R2

Para que la aplicacion lea desde R2, publica estos objetos bajo el prefijo
`spain-electoral-forecast/` del dominio de datos:

```text
estimaciones_nacionales.parquet
estimaciones_provinciales.parquet
escenarios_nacionales.parquet
first_force_probability.parquet
provincias_spain.geojson
data-version.json
results_prev.parquet
results_prev_prov.parquet
simulaciones_nacionales.parquet
derived/escenarios_nacionales.json
derived/estimaciones_nacionales.json
derived/estimaciones_provinciales.json
derived/first_force_probability.json
derived/results_prev.json
derived/results_prev_prov.json
derived/simulaciones_nacionales_latest.json
```

Los JSON de `derived` no son obligatorios para el camino principal, pero si deben
estar en R2 si quieres conservar el fallback real cuando DuckDB-WASM o la lectura
de Parquet falle. Si no estan, la app caera al ultimo fallback mock en las vistas
que lo tengan definido.

Antes de subir datos a R2, regenera los JSON derivados desde los Parquet locales:

```bash
npm run generate:derived
```

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
