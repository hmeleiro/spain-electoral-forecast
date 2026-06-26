<script lang="ts">
  import { NATIONAL_LEVEL_PARTIES } from '$lib/config/parties';
  import type { NationalTrendPoint, PreviousResult } from '$lib/data/schema';
  import { formatNumber, formatPercent } from '$lib/utils/format';
  import { onMount } from 'svelte';

  export let points: NationalTrendPoint[] = [];
  export let previousResults: PreviousResult[] = [];
  export let parties: string[] = NATIONAL_LEVEL_PARTIES;
  export let onHoverDate: (date: string | null) => void = () => {};

  let voteContainer: HTMLDivElement;
  let seatContainer: HTMLDivElement;
  let mounted = false;
  let renderVersion = 0;
  let mode: 'parties' | 'blocks' = 'parties';
  let hoveredDate: string | null = null;
  let chartTooltip: ChartTooltip | null = null;
  const chartMarginLeft = 42;
  const chartMarginRight = 96;
  const chartMarginTop = 18;
  const chartMarginBottom = 34;

  type TrendPointWithDate = NationalTrendPoint & { dateValue: Date };
  type ChartMetric = 'vote' | 'seats';
  type ChartTooltip = {
    metric: ChartMetric;
    point: TrendPointWithDate;
    delta: number | null;
    x: number;
    y: number;
    alignRight: boolean;
  };

  const blockDefinitions = [
    { id: 'right', label: 'Derecha', color: '#2878b8', parties: ['PP', 'VOX', 'UPN'] },
    { id: 'left', label: 'Izquierda', color: '#d73027', parties: ['PSOE', 'SUMAR', 'Podemos'] },
    // { id: 'regional', label: 'Territoriales', color: '#0d9488', parties: ['ERC', 'Junts', 'PNV', 'EH Bildu', 'BNG', 'CC'] }
  ];

  $: partyPoints = points
    .filter((point) => parties.includes(point.party))
    .map((point) => ({ ...point, dateValue: new Date(`${point.date}T00:00:00`) }));
  $: blockPoints = buildBlockPoints(points).map((point) => ({
    ...point,
    dateValue: new Date(`${point.date}T00:00:00`)
  }));
  $: chartPoints = mode === 'parties' ? partyPoints : blockPoints;
  $: activeSeries = mode === 'parties' ? parties : blockDefinitions.map((block) => block.id);
  $: previousByParty = new Map(previousResults.map((result) => [result.party, result]));
  $: voteEndLabels = repelEndLabels(chartPoints, activeSeries, 'voteShareMean', 2.5);
  $: seatEndLabels = repelEndLabels(chartPoints, activeSeries, 'seatsMean', mode === 'blocks' ? 15 : 14);
  $: renderToken = `${mode}:${chartPoints
    .map((point) => `${point.party}-${point.date}-${point.voteShareMean ?? ''}-${point.seatsMean ?? ''}`)
    .join('|')}`;

  async function render() {
    if (!mounted || !voteContainer || !seatContainer) return;
    const version = ++renderVersion;
    const Plot = await import('@observablehq/plot');
    if (version !== renderVersion) return;
    const width = Math.max(320, voteContainer.clientWidth);
    const common = {
      width,
      marginLeft: chartMarginLeft,
      marginRight: chartMarginRight,
      marginTop: 18,
      marginBottom: 34,
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: '13px'
      },
      x: {
        type: 'time' as const,
        grid: true,
        label: null,
        tickFormat: (value: Date) => formatMonthYear(value.toISOString().slice(0, 10))
      },
      color: {
        domain: activeSeries,
        range: activeSeries.map((series) => chartPoints.find((point) => point.party === series)?.color ?? '#8f8b85')
      }
    };

    const voteChart = Plot.plot({
      ...common,
      height: 310,
      y: { grid: true, label: 'Voto estimado (%)', ticks: 3},
      marks: [
        Plot.ruleY([0]),
        Plot.areaY(chartPoints.filter((point) => point.voteShareLower != null && point.voteShareUpper != null), {
          x: 'dateValue',
          y1: 'voteShareLower',
          y2: 'voteShareUpper',
          z: 'party',
          fill: (d) => d.color,
          fillOpacity: 0.12
        }),
        Plot.lineY(chartPoints.filter((point) => point.voteShareMean != null), {
          x: 'dateValue',
          y: 'voteShareMean',
          z: 'party',
          stroke: (d) => d.color,
          strokeWidth: 2.4
        }),
        Plot.dot(chartPoints.filter((point) => point.voteShareMean != null), {
          x: 'dateValue',
          y: 'voteShareMean',
          stroke: (d) => d.color,
          fill: 'white',
          r: 2.6
        }),
        Plot.text(voteEndLabels, {
          x: 'dateValue',
          y: 'labelY',
          text: 'label',
          dx: 8,
          fill: (d) => d.color,
          fontWeight: 700,
          fontSize: 14,
          textAnchor: 'start'
        })
      ]
    });

    const seatChart = Plot.plot({
      ...common,
      height: 260,
      y: { grid: true, label: 'Escaños', ticks:3, tickFormat: (value: number) => formatNumber(value, 0) },
      marks: [
        Plot.ruleY([176], { stroke: '#000000', strokeDasharray: '4 4' }),
        Plot.areaY(chartPoints.filter((point) => point.seatsLower != null && point.seatsUpper != null), {
          x: 'dateValue',
          y1: 'seatsLower',
          y2: 'seatsUpper',
          z: 'party',
          fill: (d) => d.color,
          fillOpacity: 0.12
        }),
        Plot.lineY(chartPoints.filter((point) => point.seatsMean != null), {
          x: 'dateValue',
          y: 'seatsMean',
          z: 'party',
          stroke: (d) => d.color,
          strokeWidth: 2.4
        }),
        Plot.dot(chartPoints.filter((point) => point.seatsMean != null), {
          x: 'dateValue',
          y: 'seatsMean',
          stroke: (d) => d.color,
          fill: 'white',
          r: 2.6
        }),
        Plot.text(seatEndLabels, {
          x: 'dateValue',
          y: 'labelY',
          text: 'label',
          dx: 8,
          fill: (d) => d.color,
          fontWeight: 700,
          fontSize: 14,
          textAnchor: 'start'
        })
      ]
    });

    if (version !== renderVersion) return;
    voteContainer.replaceChildren(voteChart);
    seatContainer.replaceChildren(seatChart);
  }

  function latestDate(party: string): string {
    return chartPoints
      .filter((point) => point.party === party)
      .map((point) => point.date)
      .sort()
      .at(-1) ?? '';
  }

  function formatMonthYear(value: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      month: 'short',
      year: 'numeric'
    }).format(new Date(`${value}T00:00:00`));
  }

  function intervalText(lower: number | null, upper: number | null, formatter: (value: number | null) => string): string {
    return lower == null || upper == null ? 'Intervalo: n/d' : `Intervalo: ${formatter(lower)} - ${formatter(upper)}`;
  }

  function setMode(nextMode: 'parties' | 'blocks') {
    mode = nextMode;
    chartTooltip = null;
  }

  function handlePointerMove(event: PointerEvent, metric: ChartMetric) {
    const dates = uniqueChartDates();
    if (!dates.length) {
      setHoveredDate(null);
      chartTooltip = null;
      return;
    }

    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;

    const rect = target.getBoundingClientRect();
    const plotWidth = Math.max(1, rect.width - chartMarginLeft - chartMarginRight);
    const relativeX = Math.min(Math.max(event.clientX - rect.left - chartMarginLeft, 0), plotWidth);
    const minTime = dates[0].dateValue.getTime();
    const maxTime = dates.at(-1)!.dateValue.getTime();
    const pointerTime = minTime + (relativeX / plotWidth) * (maxTime - minTime);
    const nearest = dates.reduce((best, candidate) =>
      Math.abs(candidate.dateValue.getTime() - pointerTime) < Math.abs(best.dateValue.getTime() - pointerTime)
        ? candidate
        : best
    );

    setHoveredDate(nearest.date);
    setTooltip(event, metric, target, dates);
  }

  function clearHoveredDate() {
    setHoveredDate(null);
    chartTooltip = null;
  }

  function setHoveredDate(date: string | null) {
    if (hoveredDate === date) return;
    hoveredDate = date;
    onHoverDate(date);
  }

  function uniqueChartDates(): Array<{ date: string; dateValue: Date }> {
    const byDate = new Map<string, Date>();
    for (const point of chartPoints) {
      if (point.voteShareMean == null && point.seatsMean == null) continue;
      byDate.set(point.date, point.dateValue);
    }

    return [...byDate.entries()]
      .map(([date, dateValue]) => ({ date, dateValue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function setTooltip(
    event: PointerEvent,
    metric: ChartMetric,
    target: HTMLElement,
    dates: Array<{ date: string; dateValue: Date }>
  ) {
    const svg = target.querySelector('svg');
    const rect = svg?.getBoundingClientRect() ?? target.getBoundingClientRect();
    const point = nearestPoint(event, metric, rect, dates);
    if (!point) {
      chartTooltip = null;
      return;
    }

    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;
    chartTooltip = {
      metric,
      point,
      delta: pointDelta(point, metric),
      x: Math.min(Math.max(relativeX, 12), rect.width - 12),
      y: Math.min(Math.max(relativeY, 12), rect.height - 12),
      alignRight: relativeX > rect.width - 220
    };
  }

  function nearestPoint(
    event: PointerEvent,
    metric: ChartMetric,
    rect: DOMRect,
    dates: Array<{ date: string; dateValue: Date }>
  ): TrendPointWithDate | null {
    const candidates = chartPoints.filter((point): point is TrendPointWithDate => metricValue(point, metric) != null);
    if (!candidates.length) return null;

    const domain = yDomain(metric);
    const minTime = dates[0].dateValue.getTime();
    const maxTime = dates.at(-1)!.dateValue.getTime();
    const plotWidth = Math.max(1, rect.width - chartMarginLeft - chartMarginRight);
    const plotHeight = Math.max(1, rect.height - chartMarginTop - chartMarginBottom);
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    return candidates.reduce<TrendPointWithDate | null>((best, point) => {
      const distance = pointDistance(point, metric, domain, minTime, maxTime, plotWidth, plotHeight, pointerX, pointerY);
      if (!best) return point;

      const bestDistance = pointDistance(best, metric, domain, minTime, maxTime, plotWidth, plotHeight, pointerX, pointerY);
      return distance < bestDistance ? point : best;
    }, null);
  }

  function pointDistance(
    point: TrendPointWithDate,
    metric: ChartMetric,
    domain: { min: number; max: number },
    minTime: number,
    maxTime: number,
    plotWidth: number,
    plotHeight: number,
    pointerX: number,
    pointerY: number
  ): number {
    const value = metricValue(point, metric);
    if (value == null || !Number.isFinite(value)) return Number.POSITIVE_INFINITY;

    const x =
      chartMarginLeft +
      (maxTime === minTime ? 0.5 : (point.dateValue.getTime() - minTime) / (maxTime - minTime)) * plotWidth;
    const y =
      chartMarginTop +
      (domain.max === domain.min ? 0.5 : (domain.max - value) / (domain.max - domain.min)) * plotHeight;
    return (pointerX - x) ** 2 + (pointerY - y) ** 2;
  }

  function yDomain(metric: ChartMetric): { min: number; max: number } {
    const values = chartPoints
      .flatMap((point) =>
        metric === 'vote'
          ? [point.voteShareMean, point.voteShareLower, point.voteShareUpper, 0]
          : [point.seatsMean, point.seatsLower, point.seatsUpper, 176]
      )
      .filter((value): value is number => value != null && Number.isFinite(value));

    if (!values.length) return { min: 0, max: 1 };
    return { min: Math.min(...values), max: Math.max(...values) };
  }

  function metricValue(point: NationalTrendPoint, metric: ChartMetric): number | null {
    return metric === 'vote' ? point.voteShareMean : point.seatsMean;
  }

  function pointDelta(point: NationalTrendPoint, metric: ChartMetric): number | null {
    const previousValue = previousMetricValue(point.party, metric);
    const currentValue = metricValue(point, metric);
    return previousValue == null || currentValue == null ? null : currentValue - previousValue;
  }

  function previousMetricValue(party: string, metric: ChartMetric): number | null {
    if (mode === 'blocks') {
      const block = blockDefinitions.find((definition) => definition.id === party);
      if (!block) return null;
      return sumNullable(
        block.parties.map((partyId) => {
          const previous = previousByParty.get(partyId);
          return metric === 'vote' ? previous?.voteShare ?? null : previous?.seats ?? null;
        })
      );
    }

    const previous = previousByParty.get(party);
    return metric === 'vote' ? previous?.voteShare ?? null : previous?.seats ?? null;
  }

  function formatDelta(delta: number | null, metric: ChartMetric): string {
    if (delta == null || !Number.isFinite(delta)) return 'n/d';
    const rounded = roundedDelta(delta, metric);
    const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
    const value = formatNumber(Math.abs(rounded), metric === 'vote' ? 1 : 0);
    return `${sign}${value}${metric === 'vote' ? ' pp' : ''}`;
  }

  function roundedDelta(delta: number, metric: ChartMetric): number {
    return Number(delta.toFixed(metric === 'vote' ? 1 : 0));
  }

  function deltaTone(delta: number | null, metric: ChartMetric): 'positive' | 'negative' | 'neutral' {
    if (delta == null || !Number.isFinite(delta)) return 'neutral';
    const rounded = roundedDelta(delta, metric);
    if (rounded === 0) return 'neutral';
    return rounded > 0 ? 'positive' : 'negative';
  }

  function repelEndLabels(
    sourcePoints: Array<NationalTrendPoint & { dateValue: Date }>,
    seriesIds: string[],
    metric: 'voteShareMean' | 'seatsMean',
    minimumGap: number
  ): Array<NationalTrendPoint & { dateValue: Date; labelY: number }> {
    const values = sourcePoints
      .map((point) => point[metric])
      .filter((value): value is number => value != null && Number.isFinite(value));
    if (!values.length) return [];

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const labels = seriesIds
      .map((series) =>
        sourcePoints
          .filter((point) => point.party === series && point[metric] != null)
          .sort((a, b) => a.date.localeCompare(b.date))
          .at(-1)
      )
      .filter((point): point is NationalTrendPoint & { dateValue: Date } => Boolean(point))
      .map((point) => ({ ...point, labelY: point[metric] ?? 0 }))
      .sort((a, b) => a.labelY - b.labelY);

    for (let index = 1; index < labels.length; index += 1) {
      if (labels[index].labelY - labels[index - 1].labelY < minimumGap) {
        labels[index].labelY = labels[index - 1].labelY + minimumGap;
      }
    }

    const overflow = labels.at(-1) ? labels.at(-1)!.labelY - maxValue : 0;
    if (overflow > 0) {
      labels.forEach((label) => {
        label.labelY -= overflow;
      });
    }

    for (let index = labels.length - 2; index >= 0; index -= 1) {
      if (labels[index + 1].labelY - labels[index].labelY < minimumGap) {
        labels[index].labelY = labels[index + 1].labelY - minimumGap;
      }
    }

    const underflow = labels[0] ? minValue - labels[0].labelY : 0;
    if (underflow > 0) {
      labels.forEach((label) => {
        label.labelY += underflow;
      });
    }

    return labels;
  }

  function buildBlockPoints(source: NationalTrendPoint[]): NationalTrendPoint[] {
    const grouped = new Map<string, NationalTrendPoint[]>();
    for (const point of source) {
      const rows = grouped.get(point.date) ?? [];
      rows.push(point);
      grouped.set(point.date, rows);
    }

    return [...grouped.entries()].flatMap(([date, rows]) =>
      blockDefinitions.map((block) => {
        const blockRows = rows.filter((row) => block.parties.includes(row.party));
        // The block mean is the sum of party-level means available in the trend file for that date.
        // It can differ slightly from simulation-derived block totals if upstream party means are rounded.
        return {
          date,
          party: block.id,
          label: block.label,
          color: block.color,
          voteShareMean: sumNullable(blockRows.map((row) => row.voteShareMean)),
          voteShareLower: sumNullable(blockRows.map((row) => row.voteShareLower)),
          voteShareUpper: sumNullable(blockRows.map((row) => row.voteShareUpper)),
          seatsMean: sumNullable(blockRows.map((row) => row.seatsMean)),
          seatsLower: sumNullable(blockRows.map((row) => row.seatsLower)),
          seatsUpper: sumNullable(blockRows.map((row) => row.seatsUpper)),
          isElectoral: true
        };
      })
    );
  }

  function sumNullable(values: Array<number | null>): number | null {
    const finite = values.filter((value): value is number => value != null && Number.isFinite(value));
    return finite.length ? finite.reduce((sum, value) => sum + value, 0) : null;
  }

  onMount(() => {
    mounted = true;
    render();
    const observer = new ResizeObserver(render);
    observer.observe(voteContainer);
    observer.observe(seatContainer);
    return () => observer.disconnect();
  });

  $: if (mounted && renderToken && voteEndLabels && seatEndLabels) render();
</script>

<div class="grid gap-6">
  <div class="flex justify-end">
    <div class="inline-flex rounded-md border border-[var(--color-border)] bg-white p-1 text-sm font-semibold">
      <button
        type="button"
        class:active={mode === 'parties'}
        on:click={() => setMode('parties')}
      >
        Partidos
      </button>
      <button
        type="button"
        class:active={mode === 'blocks'}
        on:click={() => setMode('blocks')}
      >
        Bloques
      </button>
    </div>
  </div>

  <div>
    <div class="mb-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
      <h3 class="text-base font-semibold text-[var(--color-text)]">Evolucion de voto</h3>
      <p class="text-xs text-[var(--color-text-secondary)]">Variacion del tooltip representa la diferencia respecto a las elecciones del 23J.</p>
    </div>
    <div class="chart-shell">
      <div
        bind:this={voteContainer}
        class="chart-frame min-h-80"
        role="img"
        aria-label="Evolucion de voto por fecha"
        on:pointermove={(event) => handlePointerMove(event, 'vote')}
        on:pointerleave={clearHoveredDate}
      ></div>
      {#if chartTooltip?.metric === 'vote'}
        <div
          class:align-right={chartTooltip.alignRight}
          class="chart-tooltip"
          style={`left: ${chartTooltip.x}px; top: ${chartTooltip.y}px;`}
        >
          <div class="tooltip-title">{chartTooltip.point.label}</div>
          <div>{formatMonthYear(chartTooltip.point.date)}</div>
          <div>
            Voto: {formatPercent(chartTooltip.point.voteShareMean, 1)}
            <span class={deltaTone(chartTooltip.delta, 'vote')}>({formatDelta(chartTooltip.delta, 'vote')})</span>
          </div>
          <div>{intervalText(chartTooltip.point.voteShareLower, chartTooltip.point.voteShareUpper, (value) => formatPercent(value, 1))}</div>
        </div>
      {/if}
    </div>
  </div>

  <div>
    <div class="mb-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
      <h3 class="text-base font-semibold text-[var(--color-text)]">Evolucion de escaños</h3>
      <p class="text-xs text-[var(--color-text-secondary)]">Linea discontinua: mayoria absoluta.</p>
    </div>
    <div class="chart-shell">
      <div
        bind:this={seatContainer}
        class="chart-frame min-h-64"
        role="img"
        aria-label="Evolucion de escanos por fecha"
        on:pointermove={(event) => handlePointerMove(event, 'seats')}
        on:pointerleave={clearHoveredDate}
      ></div>
      {#if chartTooltip?.metric === 'seats'}
        <div
          class:align-right={chartTooltip.alignRight}
          class="chart-tooltip"
          style={`left: ${chartTooltip.x}px; top: ${chartTooltip.y}px;`}
        >
          <div class="tooltip-title">{chartTooltip.point.label}</div>
          <div>{formatMonthYear(chartTooltip.point.date)}</div>
          <div>
            Escaños: {formatNumber(chartTooltip.point.seatsMean, 0)}
            <span class={deltaTone(chartTooltip.delta, 'seats')}>({formatDelta(chartTooltip.delta, 'seats')})</span>
          </div>
          <div>{intervalText(chartTooltip.point.seatsLower, chartTooltip.point.seatsUpper, (value) => formatNumber(value, 0))}</div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  button {
    border-radius: 0.375rem;
    color: var(--color-text-secondary);
    padding: 0.35rem 0.75rem;
  }

  button.active {
    background: var(--color-accent);
    color: white;
  }

  .chart-shell {
    position: relative;
  }

  .chart-tooltip {
    position: absolute;
    z-index: 20;
    max-width: min(260px, calc(100% - 24px));
    transform: translate(12px, -50%);
    pointer-events: none;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: var(--shadow-md);
    color: var(--color-text);
    font-size: 13px;
    font-weight: 500;
    line-height: 1.35;
    padding: 0.55rem 0.65rem;
    white-space: nowrap;
  }

  .chart-tooltip.align-right {
    transform: translate(calc(-100% - 12px), -50%);
  }

  .tooltip-title {
    font-weight: 800;
  }

  .positive {
    color: #15803d;
    font-weight: 800;
  }

  .negative {
    color: #b91c1c;
    font-weight: 800;
  }

  .neutral {
    color: var(--color-text-secondary);
    font-weight: 700;
  }
</style>
