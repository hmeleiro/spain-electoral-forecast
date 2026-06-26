<script lang="ts">
  import { formatNumber } from '$lib/utils/format';

  export let parties: SeatBalanceParty[] = [];

  type SeatBalanceParty = {
    party: string;
    label: string;
    color: string;
    seatsMean: number | null;
    isElectoral?: boolean;
  };

  type SegmentGroup = 'left' | 'center' | 'right';

  type SeatSegment = SeatBalanceParty & {
    seats: number;
    group: SegmentGroup;
  };

  const totalSeats = 350;
  const leftOrder = ['PSOE', 'SUMAR', 'Podemos', 'ERC', 'Junts', 'EH Bildu', 'BNG', 'PNV'];
  const centerOrder = ['CC'];
  const rightOrder = ['UPN', 'SALF', 'VOX', 'PP'];

  $: sourceSegments = parties
    .filter((party) => party.isElectoral !== false && party.seatsMean != null && party.seatsMean > 0)
    .map((party) => ({
      ...party,
      seats: party.seatsMean ?? 0,
      group: segmentGroup(party.party)
    }));
  $: leftSegments = orderedSegments(sourceSegments, leftOrder, 'left');
  $: centerSegments = orderedSegments(sourceSegments, centerOrder, 'center');
  $: rightSegments = orderedSegments(sourceSegments, rightOrder, 'right');
  $: displaySegments = [...leftSegments, ...centerSegments, ...rightSegments];
  $: leftSeats = sumSeats(leftSegments);
  $: centerSeats = sumSeats(centerSegments);
  $: rightSeats = sumSeats(rightSegments);
  $: totalShownSeats = leftSeats + centerSeats + rightSeats;

  function segmentGroup(party: string): SegmentGroup {
    if (leftOrder.includes(party)) return 'left';
    if (rightOrder.includes(party)) return 'right';
    if (centerOrder.includes(party)) return 'center';
    return 'center';
  }

  function orderedSegments(segments: SeatSegment[], order: string[], group: SegmentGroup): SeatSegment[] {
    return segments
      .filter((segment) => segment.group === group)
      .sort((a, b) => orderIndex(a.party, order) - orderIndex(b.party, order) || b.seats - a.seats);
  }

  function orderIndex(party: string, order: string[]): number {
    const index = order.indexOf(party);
    return index === -1 ? order.length : index;
  }

  function sumSeats(segments: SeatSegment[]): number {
    return segments.reduce((sum, segment) => sum + segment.seats, 0);
  }

  function segmentWidth(seats: number): string {
    return `${Math.max(0, (seats / totalSeats) * 100)}%`;
  }

  function segmentTitle(segment: SeatSegment): string {
    return `${segment.label}: ${formatNumber(segment.seats, 0)} esc.`;
  }

  let labelMeasureContext: CanvasRenderingContext2D | null = null;

  function fitLabel(node: HTMLElement) {
    const update = () => {
      const parent = node.parentElement;
      if (!parent) return;
      const style = getComputedStyle(node);
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const labelWidth = measureText(node.textContent ?? '', style.font) + padding + 2;
      node.style.display = labelWidth > parent.clientWidth ? 'none' : '';
    };
    const frameUpdate = () => requestAnimationFrame(update);
    const observer = new ResizeObserver(frameUpdate);
    if (node.parentElement) observer.observe(node.parentElement);
    observer.observe(node);
    frameUpdate();
    document.fonts?.ready.then(frameUpdate);

    return {
      update: frameUpdate,
      destroy() {
        observer.disconnect();
      }
    };
  }

  function measureText(text: string, font: string): number {
    const context = labelMeasureContext ?? document.createElement('canvas').getContext('2d');
    if (!context) return 0;
    labelMeasureContext = context;
    context.font = font;
    return context.measureText(text).width;
  }
</script>

<div class="seat-balance" role="img" aria-label="Reparto de escaños">
  <div class="seat-summary">
    <span>PSOE + Sumar + aliados: <strong>{formatNumber(leftSeats, 0)}</strong></span>
    <!-- <span>CC: <strong>{formatNumber(centerSeats, 0)}</strong></span> -->
    <span>Derecha: <strong>{formatNumber(rightSeats, 0)}</strong></span>
  </div>

  <div class="track">
    <div class="segments">
      {#each displaySegments as segment}
        <div
          class="segment"
          style={`flex-basis: ${segmentWidth(segment.seats)}; background: ${segment.color};`}
          title={segmentTitle(segment)}
        >
          <span use:fitLabel>{segment.label}</span>
        </div>
      {/each}
    </div>

    <div class="majority-line">
      <!-- <span>175</span> -->
    </div>
  </div>

</div>

<style>
  .seat-balance {
    display: grid;
    gap: 0.75rem;
  }

  .seat-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    color: var(--color-text-secondary);
    font-size: 0.82rem;
    line-height: 1.25;
  }

  .seat-summary {
    flex-wrap: wrap;
    font-weight: 650;
  }

  .seat-summary strong {
    color: var(--color-text);
  }

  .track {
    position: relative;
    height: 2.65rem;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: #f1f3f5;
  }

  .segments {
    display: flex;
    height: 100%;
    min-width: 100%;
  }

  .segment {
    display: flex;
    flex: 0 0 auto;
    min-width: 0;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: white;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.22);
  }

  .segment span {
    display: inline-block;
    flex: 0 0 auto;
    padding: 0 0.35rem;
    white-space: nowrap;
  }

  .majority-line {
    position: absolute;
    top: -1px;
    bottom: -1px;
    left: 50%;
    z-index: 4;
    width: 1px;
    background: rgba(26, 26, 46, 0.52);
  }

  @media (max-width: 640px) {
    .seat-summary {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.25rem;
    }

    .track {
      height: 2.3rem;
    }
  }
</style>
