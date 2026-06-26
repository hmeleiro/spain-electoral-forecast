<script lang="ts">
  import { onMount } from 'svelte';
  import ProvincialSeatSquares from '$lib/components/charts/ProvincialSeatSquares.svelte';
  import SeatProjectionChart from '$lib/components/charts/SeatProjectionChart.svelte';
  import VoteShareChart from '$lib/components/charts/VoteShareChart.svelte';
  import LoadingState from '$lib/components/layout/LoadingState.svelte';
  import ProvinceMap from '$lib/components/maps/ProvinceMap.svelte';
  import {
    getAvailableProvinces,
    loadModelMetadata,
    loadNationalEstimates,
    loadPreviousProvinceResults,
    loadProvinceEstimates,
    loadProvinceMapCollection
  } from '$lib/data';
  import type {
    NationalEstimate,
    PreviousProvinceResult,
    ProvinceEstimate,
    ProvinceMapCollection
  } from '$lib/data/schema';
  import { electoralParties } from '$lib/data/transforms';
  import { formatDate, formatPercent, formatSeats } from '$lib/utils/format';

  const provinceOptions = getAvailableProvinces();

  let loading = true;
  let selectedProvince = '28';
  let latestDate = '2026-04-05';
  let allProvinceEstimates: ProvinceEstimate[] = [];
  let allPreviousProvinceResults: PreviousProvinceResult[] = [];
  let provinceRows: ProvinceEstimate[] = [];
  let previousProvinceRows: PreviousProvinceResult[] = [];
  let national: NationalEstimate | null = null;
  let mapCollection: ProvinceMapCollection | null = null;
  let lastLoadedProvince = '';

  $: selectedProvince = selectedProvince.padStart(2, '0');
  $: selectedName = provinceOptions.find((province) => province.code === selectedProvince)?.name ?? 'Madrid';
  $: provinceParties = electoralParties(provinceRows).sort(
    (a, b) => (b.voteShareMean ?? -1) - (a.voteShareMean ?? -1) || (b.seatsMean ?? -1) - (a.seatsMean ?? -1)
  );
  $: nationalComparable =
    national?.parties.filter((party) => provinceParties.some((provinceParty) => provinceParty.party === party.party)) ?? [];
  $: comparisonParties = provinceParties.slice(0, 7).map((party) => {
    const nationalParty = nationalComparable.find((candidate) => candidate.party === party.party);
    const delta =
      party.voteShareMean != null && nationalParty?.voteShareMean != null
        ? party.voteShareMean - nationalParty.voteShareMean
        : null;

    return { party, nationalParty, delta };
  });
  $: maxNationalDelta = Math.max(1, ...comparisonParties.map(({ delta }) => Math.abs(delta ?? 0)));

  function formatDifference(value: number | null): string {
    if (value == null || Number.isNaN(value)) return 'n/d';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toLocaleString('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} pp`;
  }

  function comparisonWidth(value: number | null): number {
    if (value == null || maxNationalDelta <= 0) return 0;
    return Math.min(100, (Math.abs(value) / maxNationalDelta) * 100);
  }

  function loadProvinceDetail() {
    const localRows = allProvinceEstimates.filter((estimate) => estimate.provinceCode === selectedProvince);
    const localPreviousRows = allPreviousProvinceResults.filter((result) => result.provinceCode === selectedProvince);
    provinceRows = localRows;
    previousProvinceRows = localPreviousRows;
    lastLoadedProvince = selectedProvince;
  }

  function selectProvince(code: string) {
    selectedProvince = code.padStart(2, '0');
    window.history.replaceState(null, '', `/provincias?provincia=${selectedProvince}`);
  }

  function handleProvinceSelect(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    selectProvince(select.value);
  }

  onMount(async () => {
    selectedProvince = new URLSearchParams(window.location.search).get('provincia') ?? selectedProvince;
    const metadata = await loadModelMetadata();
    latestDate = metadata.latestDate;
    const previousDate = metadata.dates.at(-2);
    const [provinceEstimates, previousProvinceEstimates, nationalEstimate, previousProvinceResults] = await Promise.all([
      loadProvinceEstimates(latestDate),
      previousDate ? loadProvinceEstimates(previousDate) : Promise.resolve([]),
      loadNationalEstimates(latestDate),
      loadPreviousProvinceResults()
    ]);

    allProvinceEstimates = provinceEstimates;
    allPreviousProvinceResults = previousProvinceResults;
    national = nationalEstimate;
    mapCollection = await loadProvinceMapCollection(provinceEstimates, previousProvinceEstimates);
    loadProvinceDetail();
    loading = false;
  });

  $: if (!loading && allProvinceEstimates.length && selectedProvince !== lastLoadedProvince) {
    loadProvinceDetail();
  }
</script>

<svelte:head>
  <title>Provincias · Spain Electoral Forecast</title>
</svelte:head>

<section class="editorial-shell py-10 md:py-14">
  <div class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
    <div>
      <p class="eyebrow">Analisis provincial</p>
      <h1 class="mt-3 text-4xl font-bold leading-tight text-[var(--color-text)] md:text-5xl">Provincias</h1>
      <p class="mt-3 text-sm text-[var(--color-text-secondary)]">Selecciona una provincia en el mapa o en el desplegable.</p>
    </div>
    <label class="text-sm font-bold text-[var(--color-text-secondary)]">
      Provincia
      <select value={selectedProvince} onchange={handleProvinceSelect} class="mt-2 block rounded border border-[#c9c0b3] bg-white px-3 py-2">
        {#each provinceOptions as province}
          <option value={province.code}>{province.name}</option>
        {/each}
      </select>
    </label>
  </div>

  {#if loading}
    <div class="mt-8">
      <LoadingState />
    </div>
  {:else}
    {#if mapCollection}
      <section class="panel mt-8 p-5">
        <ProvinceMap
          collection={mapCollection}
          selectedProvinceCode={selectedProvince}
          onProvinceClick={selectProvince}
        />
      </section>
    {/if}

    <!-- <section class="panel mt-8 p-5">
      <div class="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-[var(--color-text)]">Escanos en todas las provincias</h2>
          <p class="text-sm text-[var(--color-text-secondary)]">Borde oscuro: sube respecto a 23J; opacidad baja: retrocede.</p>
        </div>
      </div>
      <ProvincialSeatSquares
        estimates={allProvinceEstimates}
        previousResults={allPreviousProvinceResults}
        variant="matrix"
      />
    </section> -->

    <section class="mt-8 border-t border-[var(--color-border)] pt-8">
      <p class="eyebrow">Ficha provincial</p>
      <h2 class="mt-3 text-3xl font-bold leading-tight text-[var(--color-text)] md:text-4xl">{selectedName}</h2>
      <p class="mt-2 text-sm text-[var(--color-text-secondary)]">Estimacion de {formatDate(latestDate)}</p>
    </section>


    <div class="mt-8 grid gap-4 md:grid-cols-3">
      {#each provinceParties.slice(0, 3) as party}
        <article class="panel p-5">
          <p class="text-sm font-bold" style={`color:${party.color}`}>{party.label}</p>
          <p class="mt-2 text-3xl font-bold text-[var(--color-text)]">{formatPercent(party.voteShareMean)}</p>
          <p class="mt-2 text-sm text-[var(--color-text-secondary)]">{formatSeats(party.seatsMean)} escaños</p>
        </article>
      {/each}
    </div>

            <section class="panel mt-8 p-5">
      <div class="mb-5">
        <h2 class="text-xl font-semibold text-[var(--color-text)]">Escanos por candidatura</h2>
        <p class="text-sm text-[var(--color-text-secondary)]">Borde oscuro: sube respecto a 23J; opacidad baja: retrocede.</p>
      </div>
      <ProvincialSeatSquares estimates={provinceRows} previousResults={previousProvinceRows} />
    </section>

    <div class="mt-8 grid gap-6 lg:grid-cols-2">
      <section class="panel p-5">
        <div class="mb-4">
          <h2 class="text-xl font-semibold text-[var(--color-text)]">Voto por partido</h2>
          <p class="text-sm text-[var(--color-text-secondary)]">Estimacion provincial; marca vertical: resultado 23J.</p>
        </div>
        <VoteShareChart parties={provinceParties} previousResults={previousProvinceRows} />
      </section>
      
      <section class="panel p-5">
        <div class="mb-4">
          <h2 class="text-xl font-semibold text-[var(--color-text)]">Escaños provinciales</h2>
          <p class="text-sm text-[var(--color-text-secondary)]">Media de escanos por candidatura; marca vertical: 23J.</p>
        </div>
        <SeatProjectionChart parties={provinceParties} previousResults={previousProvinceRows} showMajorityLine={false} />
      </section>
    </div>

    <section class="panel mt-8 w-full p-5 md:w-1/2">
      <h2 class="text-xl font-semibold text-[var(--color-text)]">Comparacion nacional</h2>
        <h4>Diferencia entre el % en la provincia y el % nacional</h4>
      <div class="mt-4 space-y-3">
        {#each comparisonParties as { party, nationalParty, delta }}
          <div>
            <div class="flex items-center justify-between gap-4 text-sm">
              <span class="font-bold" style={`color:${party.color}`}>{party.label}</span>
              <span class="tabular-nums text-[#5e5a54]">
              {formatDifference(delta)}
                <!-- {formatPercent(party.voteShareMean)} prov. · {formatPercent(nationalParty?.voteShareMean)} nac. · {formatDifference(delta)} -->
              </span>
            </div>
            <div class="relative mt-1 grid h-3 grid-cols-2 overflow-hidden rounded bg-[#edf0f3]">
              <div class="flex justify-end border-r border-[#8f8b85]">
                {#if delta != null && delta < 0}
                  <div
                    class="h-full rounded-l"
                    style={`width:${comparisonWidth(delta)}%;background:${party.color};opacity:0.45`}
                  ></div>
                {/if}
              </div>
              <div>
                {#if delta != null && delta > 0}
                  <div
                    class="h-full rounded-r"
                    style={`width:${comparisonWidth(delta)}%;background:${party.color}`}
                  ></div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>

  {/if}
</section>
