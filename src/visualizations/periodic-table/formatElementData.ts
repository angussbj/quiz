import type { GridElement } from './GridElement';
import { formatHalfLife } from './formatHalfLife';

export type ElementDataField =
  | 'half-life' | 'density' | 'state' | 'electronegativity'
  | 'year-discovered' | 'melting-point' | 'boiling-point' | 'cost';

function formatDensity(density: number | undefined): string {
  if (density === undefined) return '—';
  if (density >= 100) return `${Math.round(density)} g/cm³`;
  if (density >= 10) return `${density.toFixed(1)} g/cm³`;
  if (density >= 0.01) return `${density.toFixed(2)} g/cm³`;
  return `${density.toExponential(1)} g/cm³`;
}

function formatElectronegativity(en: number | undefined): string {
  if (en === undefined) return '—';
  return en.toFixed(2).replace(/0$/, '');
}

function formatState(state: string | undefined): string {
  if (state === undefined) return '—';
  return state.charAt(0).toUpperCase() + state.slice(1);
}

function formatYearDiscovered(year: number | undefined): string {
  if (year === undefined) return 'Ancient';
  return year.toString();
}

function formatTemperature(kelvin: number | undefined): string {
  if (kelvin === undefined) return '—';
  if (kelvin >= 1000) return `${Math.round(kelvin)} K`;
  if (kelvin >= 100) return `${kelvin.toFixed(1)} K`;
  return `${kelvin.toFixed(2)} K`;
}

function formatCompact(value: number): string {
  if (value >= 100) return Math.round(value).toString();
  if (value >= 10) return value.toFixed(1).replace(/\.0$/, '');
  return value.toPrecision(2);
}

function formatCostValue(cost: number): string {
  if (cost >= 1e15) {
    const exp = Math.floor(Math.log10(cost));
    return `$10^${exp}`;
  }
  if (cost >= 1e12) return `$${formatCompact(cost / 1e12)}T`;
  if (cost >= 1e9) return `$${formatCompact(cost / 1e9)}B`;
  if (cost >= 1e6) return `$${formatCompact(cost / 1e6)}M`;
  if (cost >= 1e3) return `$${formatCompact(cost / 1e3)}K`;
  if (cost >= 1) return `$${formatCompact(cost)}`;
  return `$${cost.toPrecision(2)}`;
}

function formatCost(element: GridElement): string {
  if (element.costUsdPerKg === undefined) return '—';
  const prefix = element.costIsApproximate ? '~' : '';
  const suffix = element.costIsEstimate ? '?' : '';
  return `${prefix}${formatCostValue(element.costUsdPerKg)}/kg${suffix}`;
}

export function formatElementData(element: GridElement, field: ElementDataField): string {
  switch (field) {
    case 'half-life': return formatHalfLife(element.halfLifeSeconds);
    case 'density': return formatDensity(element.density);
    case 'state': return formatState(element.standardState);
    case 'electronegativity': return formatElectronegativity(element.electronegativity);
    case 'year-discovered': return formatYearDiscovered(element.yearDiscovered);
    case 'melting-point': return formatTemperature(element.meltingPoint);
    case 'boiling-point': return formatTemperature(element.boilingPoint);
    case 'cost': return formatCost(element);
  }
}
