<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import NationalEvolutionChart from '$lib/components/charts/NationalEvolutionChart.svelte';
  import ProbabilityCards from '$lib/components/charts/ProbabilityCards.svelte';
  import SeatProjectionChart from '$lib/components/charts/SeatProjectionChart.svelte';
  import SimulationHistogram from '$lib/components/charts/SimulationHistogram.svelte';
  import VoteShareChart from '$lib/components/charts/VoteShareChart.svelte';
  import ErrorState from '$lib/components/layout/ErrorState.svelte';
  import LoadingState from '$lib/components/layout/LoadingState.svelte';
  import ModelNotes from '$lib/components/layout/ModelNotes.svelte';
  import ProvinceMap from '$lib/components/maps/ProvinceMap.svelte';
  import ScenarioTable from '$lib/components/tables/ScenarioTable.svelte';
  import {
    loadModelMetadata,
    loadNationalEstimates,
    loadNationalEstimateSeries,
    loadNationalSimulations,
    loadPreviousNationalResults,
    loadPreviousProvinceResults,
    loadProvinceEstimates,
    loadProvinceMapCollection
  } from '$lib/data';
  import type {
    ModelMetadata,
    NationalEstimate,
    NationalTrendPoint,
    PreviousProvinceResult,
    PreviousResult,
    ProvinceEstimate,
    ProvinceMapCollection,
    ScenarioSummary,
    SeatDistribution,
    SimulationResult
  } from '$lib/data/schema';
  import {
    buildScenarioSummaries,
    buildSeatDistributions,
    electoralParties
  } from '$lib/data/transforms';
  import { formatMonthYear, formatPercent, formatSeats } from '$lib/utils/format';

  let loading = true;
  let errorMessage = '';
  let metadata: ModelMetadata | null = null;
  let national: NationalEstimate | null = null;
  let provinces: ProvinceEstimate[] = [];
  let mapCollection: ProvinceMapCollection | null = null;
  let distributions: SeatDistribution[] = [];
  let scenarios: ScenarioSummary[] = [];
  let trendPoints: NationalTrendPoint[] = [];
  let previousNationalResults: PreviousResult[] = [];
  let previousProvinceResults: PreviousProvinceResult[] = [];
  let leadingPartyWinProbability = 0;

  $: electoralNational = national ? electoralParties(national.parties) : [];
  $: topParties = electoralNational.slice(0, 5);
  $: leadingParty = topParties[0];

  onMount(async () => {
    try {
      metadata = await loadModelMetadata();
      const latestDate = metadata.latestDate;
      const previousDate = metadata.dates.at(-2);
      const [
        nationalEstimate,
        provinceEstimates,
        previousProvinceEstimates,
        nationalSimulations,
        nationalSeries,
        previousNational,
        previousProvince
      ] = await Promise.all([
        loadNationalEstimates(latestDate),
        loadProvinceEstimates(latestDate),
        previousDate ? loadProvinceEstimates(previousDate) : Promise.resolve([]),
        loadNationalSimulations(latestDate),
        loadNationalEstimateSeries(),
        loadPreviousNationalResults(),
        loadPreviousProvinceResults()
      ]);

      national = nationalEstimate;
      provinces = provinceEstimates;
      trendPoints = nationalSeries;
      previousNationalResults = previousNational;
      previousProvinceResults = previousProvince;
      mapCollection = await loadProvinceMapCollection(provinceEstimates, previousProvinceEstimates);
      const localTopParties = electoralParties(nationalEstimate.parties).slice(0, 5);
      distributions = buildSeatDistributions(nationalSimulations, localTopParties.map((party) => party.party));
      scenarios = buildScenarioSummaries(nationalSimulations);
      leadingPartyWinProbability = calculateFirstForceProbability(nationalSimulations, localTopParties[0]?.party);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    } finally {
      loading = false;
    }
  });

  function openProvince(code: string) {
    goto(`/provincias?provincia=${code}`);
  }

  function calculateFirstForceProbability(simulations: SimulationResult[], partyId: string | undefined): number {
    if (!partyId) return 0;

    const bySimulation = new Map<number, SimulationResult[]>();
    for (const simulation of simulations) {
      if (!simulation.isElectoral || simulation.votes == null) continue;
      const rows = bySimulation.get(simulation.simulationId) ?? [];
      rows.push(simulation);
      bySimulation.set(simulation.simulationId, rows);
    }

    let wins = 0;
    let total = 0;
    for (const rows of bySimulation.values()) {
      const winner = rows.slice().sort((a, b) => (b.votes ?? -1) - (a.votes ?? -1))[0];
      if (!winner) continue;
      total += 1;
      if (winner.party === partyId) wins += 1;
    }

    return total ? wins / total : 0;
  }
</script>

<svelte:head>
  <title>Spain Electoral Forecast</title>
  <meta
    name="description"
    content="Visualizador de estimaciones electorales del Spain Electoral Forecast basadas en microdatos CIS."
  />
</svelte:head>

<section class="border-b border-[var(--color-border)] bg-[var(--color-surface)] py-16 md:py-10">
  <div class="editorial-shell">
    <div class="max-w-3xl">
      <p class="eyebrow">Modelo electoral</p>
      <h1 class="mt-3 text-4xl font-bold leading-tight text-[var(--color-text)] md:text-5xl">
        Spain Electoral Forecast
      </h1>
      <p class="mt-5 max-w-2xl text-xl leading-8 text-[var(--color-text-secondary)]">
        Proyección electoral para el Congreso de los Diputados.
      </p>
    </div>
  </div>
</section>

<section class="editorial-shell py-10 md:py-4">

  {#if loading}
    <div class="mt-8">
      <LoadingState />
    </div>
  {:else}
    {#if errorMessage}
      <div class="mt-8">
        <ErrorState message={errorMessage} />
      </div>
    {/if}

    {#if national && metadata}
      <p class="mt-8 text-sm font-semibold text-[var(--color-text-secondary)]">
        Ultima estimacion: {formatMonthYear(national.date)}
      </p>

      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <div class="panel p-5">
          <p class="text-sm font-bold text-[var(--color-accent)]">Primera fuerza</p>
          <p class="mt-2 text-3xl font-bold" style={`color:${leadingParty?.color}`}>
            {leadingParty?.label ?? 'n/d'}
          </p>
          <p class="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            {formatPercent(leadingParty?.voteShareMean)} y {formatSeats(leadingParty?.seatsMean)} escaños medios.
          </p>
          <p class="mt-2 text-xs text-[var(--color-text-secondary)]">
            Prob. primera fuerza: {formatPercent(leadingPartyWinProbability * 100, 0)}
          </p>
        </div>
        <div class="h-full md:col-span-2">
          <ProbabilityCards {scenarios} />
        </div>
      </div>

      <section class="panel mt-8 p-5 md:p-6">
        <div class="mb-5">
          <h2 class="text-2xl font-semibold text-[var(--color-text)]">Evolucion nacional</h2>
          <p class="text-sm text-[var(--color-text-secondary)]">
            Serie historica de estimaciones para partidos con candidatura estatal.
          </p>
        </div>
        <NationalEvolutionChart points={trendPoints} />
      </section>

      <div class="mt-8 grid gap-6 lg:grid-cols-2">
        <section class="panel p-5">
          <div class="mb-4">
            <h2 class="text-xl font-semibold text-[var(--color-text)]">Intencion de voto</h2>
            <p class="text-sm text-[var(--color-text-secondary)]">Barras con media estimada; marca vertical: resultado 23J.</p>
          </div>
          <VoteShareChart parties={national.parties} previousResults={previousNationalResults} />
        </section>

        <section class="panel p-5">
          <div class="mb-4">
            <h2 class="text-xl font-semibold text-[var(--color-text)]">Proyeccion de escanos</h2>
            <p class="text-sm text-[var(--color-text-secondary)]">La linea discontinua marca la mayoria absoluta; marca vertical: 23J.</p>
          </div>
          <SeatProjectionChart parties={national.parties} previousResults={previousNationalResults} />
        </section>
      </div>

      <section class="panel mt-8 p-5">
        <SimulationHistogram {distributions} />
      </section>

      <section class="panel mt-8 p-5">
        {#if mapCollection}
          <ProvinceMap collection={mapCollection} onProvinceClick={openProvince} />
        {/if}
      </section>

      <section class="panel mt-8 p-5">
        <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 class="text-xl font-semibold text-[var(--color-text)]">Tabla provincial</h2>
            <p class="text-sm text-[var(--color-text-secondary)]">Primera y segunda fuerza por voto.</p>
          </div>
          <a class="text-sm font-bold text-[var(--color-accent)]" href="/provincias">Ver detalle provincial</a>
        </div>
        <ScenarioTable estimates={provinces} previousResults={previousProvinceResults} />
      </section>

      <div class="mt-8">
        <ModelNotes />
      </div>
    {/if}
  {/if}
</section>
