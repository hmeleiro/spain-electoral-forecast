import { bin } from 'd3-array';
import type { HistogramBucket } from '$lib/data/schema';

export function mean(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

export function extent(values: number[]): [number, number] {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return [0, 0];
  return [Math.min(...finite), Math.max(...finite)];
}

export function histogram(values: number[], thresholds = 16): HistogramBucket[] {
  const finite = values.filter(Number.isFinite);
  return bin().thresholds(thresholds)(finite).map((bucket) => ({
    x0: bucket.x0 ?? 0,
    x1: bucket.x1 ?? 0,
    count: bucket.length
  }));
}

export function integerHistogram(values: number[]): HistogramBucket[] {
  const finite = values.filter(Number.isFinite).map((value) => Math.round(value));
  if (!finite.length) return [];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  return Array.from({ length: max - min + 1 }, (_, index) => {
    const x0 = min + index;
    return {
      x0,
      x1: x0 + 1,
      count: finite.filter((value) => value === x0).length
    };
  });
}
