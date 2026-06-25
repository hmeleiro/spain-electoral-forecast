<script lang="ts">
  import { onMount } from 'svelte';
  import type { DataDrivenPropertyValueSpecification } from 'maplibre-gl';
  import type { ProvinceMapCollection, ProvinceMapMetric } from '$lib/data/schema';
  import { formatPercent } from '$lib/utils/format';

  export let collection: ProvinceMapCollection;
  export let metric: ProvinceMapMetric = 'winner';
  export let selectedProvinceCode = '';
  export let onProvinceClick: (provinceCode: string) => void = () => {};

  let mapNode: HTMLDivElement;
  let mounted = false;
  let selectedMetric = metric;
  let map: import('maplibre-gl').Map | null = null;
  let popup: import('maplibre-gl').Popup | null = null;

  const sourceId = 'provinces';
  const fillLayerId = 'province-fill';
  const lineLayerId = 'province-line';
  const selectedLineLayerId = 'province-selected-line';

  function colorExpression(activeMetric: ProvinceMapMetric): unknown[] {
    if (activeMetric === 'voteShare') {
      return ['coalesce', ['get', 'winnerVoteShareColor'], ['get', 'winnerColor'], '#ded7cc'];
    }

    if (activeMetric === 'change') {
      return [
        'case',
        ['==', ['get', 'change'], null],
        '#ded7cc',
        ['interpolate', ['linear'], ['to-number', ['get', 'change']], -8, '#b2182b', 0, '#f7f7f7', 8, '#2166ac']
      ];
    }

    return ['coalesce', ['get', 'winnerColor'], '#ded7cc'];
  }

  function opacityExpression(activeMetric: ProvinceMapMetric): number | unknown[] {
    if (activeMetric === 'voteShare') {
      return 0.96;
    }

    if (activeMetric === 'change') return 0.86;

    return 0.82;
  }

  function updateMapData() {
    const source = map?.getSource(sourceId) as import('maplibre-gl').GeoJSONSource | undefined;
    source?.setData(collection as GeoJSON.FeatureCollection);

    if (map?.getLayer(fillLayerId)) {
      map.setPaintProperty(
        fillLayerId,
        'fill-color',
        colorExpression(selectedMetric) as DataDrivenPropertyValueSpecification<string>
      );
      map.setPaintProperty(
        fillLayerId,
        'fill-opacity',
        opacityExpression(selectedMetric) as DataDrivenPropertyValueSpecification<number>
      );
    }

    if (map?.getLayer(selectedLineLayerId)) {
      map.setFilter(selectedLineLayerId, ['==', ['get', 'code'], selectedProvinceCode]);
    }
  }

  function metricLine(props: Record<string, string | number | null>): string {
    if (selectedMetric === 'change') {
      const value = typeof props.change === 'number' ? props.change : Number(props.change);
      if (!Number.isFinite(value)) return 'Cambio: n/d';
      const sign = value > 0 ? '+' : '';
      return `Cambio: ${sign}${formatPercent(value)}`;
    }

    if (selectedMetric === 'voteShare') {
      return `Ganador: ${props.winnerLabel ?? 'n/d'} - ${formatPercent(Number(props.voteShare))}`;
    }

    return `${props.winnerLabel ?? 'n/d'} - ${formatPercent(Number(props.voteShare))}`;
  }

  onMount(() => {
    mounted = true;
    let disposed = false;

    async function initMap() {
      const maplibregl = await import('maplibre-gl');
      if (disposed) return;

      map = new maplibregl.Map({
        container: mapNode,
        style: {
          version: 8,
          sources: {},
          layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#fffaf2' } }]
        },
        center: [-3.7, 40.2],
        zoom: 4.6,
        attributionControl: false
      });

      popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });

      map.on('load', () => {
        map?.addSource(sourceId, {
          type: 'geojson',
          data: collection as GeoJSON.FeatureCollection
        });
        map?.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': colorExpression(selectedMetric) as DataDrivenPropertyValueSpecification<string>,
            'fill-opacity': opacityExpression(selectedMetric) as DataDrivenPropertyValueSpecification<number>
          }
        });
        map?.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#fffaf2',
            'line-width': 1.4
          }
        });
        map?.addLayer({
          id: selectedLineLayerId,
          type: 'line',
          source: sourceId,
          filter: ['==', ['get', 'code'], selectedProvinceCode],
          paint: {
            'line-color': '#171717',
            'line-width': 2.6
          }
        });

        map?.on('mousemove', fillLayerId, (event) => {
          const feature = event.features?.[0];
          if (!feature || !popup) return;
          const props = feature.properties as Record<string, string | number | null>;
          const html = `<strong>${props.name}</strong><br>${metricLine(props)}`;
          popup.setLngLat(event.lngLat).setHTML(html).addTo(map!);
          if (map) map.getCanvas().style.cursor = 'pointer';
        });

        map?.on('mouseleave', fillLayerId, () => {
          popup?.remove();
          if (map) map.getCanvas().style.cursor = '';
        });

        map?.on('click', fillLayerId, (event) => {
          const feature = event.features?.[0];
          const code = feature?.properties?.code;
          if (typeof code === 'string') onProvinceClick(code);
        });
      });
    }

    initMap();

    return () => {
      disposed = true;
      map?.remove();
    };
  });

  $: if (mounted && selectedMetric) updateMapData();
  $: if (mounted && selectedProvinceCode) updateMapData();
  $: metric = selectedMetric;
</script>

<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
  <div>
    <p class="text-sm font-bold text-[#171717]">Mapa provincial</p>
    <p class="text-xs text-[var(--color-text-secondary)]">Proyección provincial de la estimación.</p>
  </div>
  <select bind:value={selectedMetric} class="rounded border border-[#c9c0b3] bg-white px-2 py-1 text-sm">
    <option value="winner">Primera fuerza por voto</option>
    <option value="voteShare">Porcentaje del ganador</option>
    <option value="change">Cambio</option>
  </select>
</div>

<div bind:this={mapNode} class="h-[430px] w-full overflow-hidden rounded border border-[#ded7cc] bg-[#fffaf2]"></div>
