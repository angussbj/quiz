/**
 * Analyzes timeline CSV files for density distribution and suggests splitting points.
 *
 * Usage: npx ts-node scripts/analyzeTimelineDensity.ts
 *
 * Reports:
 * - Event count and time span for each quiz
 * - Density distribution across time buckets
 * - Outlier events (isolated in sparse regions)
 * - Split suggestions for quizzes with highly uneven density
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../public/data/history');

// Minimum events for a split sub-quiz to be considered worthwhile
const MIN_EVENTS_PER_SPLIT = 8;
// Density ratio threshold: if max-bucket density / min-bucket density exceeds this, flag for splitting
const DENSITY_RATIO_THRESHOLD = 10;
// Number of buckets to divide each quiz's timeline into for analysis
const NUM_BUCKETS = 5;

interface Row {
  readonly id: string;
  readonly start_year: number;
  readonly end_year: number | null;
  readonly [key: string]: unknown;
}

interface BucketInfo {
  readonly start: number;
  readonly end: number;
  readonly count: number;
  readonly items: readonly string[];
}

interface QuizAnalysis {
  readonly filePath: string;
  readonly name: string;
  readonly totalEvents: number;
  readonly minYear: number;
  readonly maxYear: number;
  readonly spanYears: number;
  readonly buckets: readonly BucketInfo[];
  readonly densityRatio: number;
  readonly outliers: readonly string[];
  readonly splitSuggestions: readonly SplitSuggestion[];
}

interface SplitSuggestion {
  readonly name: string;
  readonly startYear: number;
  readonly endYear: number;
  readonly events: readonly string[];
  readonly count: number;
}

function findCsvFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findCsvFiles(fullPath));
    } else if (entry.name.endsWith('.csv')) {
      results.push(fullPath);
    }
  }
  return results;
}

function parseYear(val: string): number | null {
  if (!val || val.trim() === '') return null;
  const n = Number(val.trim());
  return isNaN(n) ? null : n;
}


function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const record: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      record[headers[i]] = (values[i] ?? '').trim();
    }
    return record;
  });
}

function loadRows(filePath: string): Row[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parseCsv(content);

  return records
    .map(record => {
      const startYear = parseYear(record['start_year']);
      if (startYear === null) return null;
      const endYear = parseYear(record['end_year']);
      return {
        ...record,
        id: record['id'],
        start_year: startYear,
        end_year: endYear,
      } as Row;
    })
    .filter((r): r is Row => r !== null);
}

function representativeYear(row: Row): number {
  // Use start_year as the representative point for density analysis
  return row.start_year;
}

function buildBuckets(rows: Row[], minYear: number, maxYear: number, numBuckets: number): BucketInfo[] {
  const span = maxYear - minYear;
  if (span === 0) {
    return [{
      start: minYear,
      end: maxYear,
      count: rows.length,
      items: rows.map(r => r.id as string),
    }];
  }

  const buckets: BucketInfo[] = Array.from({ length: numBuckets }, (_, i) => {
    const start = minYear + (span * i) / numBuckets;
    const end = minYear + (span * (i + 1)) / numBuckets;
    const bucketRows = rows.filter(r => {
      const y = representativeYear(r);
      return i === numBuckets - 1
        ? y >= start && y <= end
        : y >= start && y < end;
    });
    return {
      start: Math.round(start),
      end: Math.round(end),
      count: bucketRows.length,
      items: bucketRows.map(r => r.id as string),
    };
  });

  return buckets;
}

function findOutliers(rows: Row[], buckets: BucketInfo[]): string[] {
  // An outlier is an event that is alone (or nearly alone) in a sparse bucket
  // when adjacent buckets are also sparse — i.e. it's isolated from the main cluster
  const outliers: string[] = [];

  const maxCount = Math.max(...buckets.map(b => b.count));
  if (maxCount === 0) return outliers;

  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i];
    const prevCount = i > 0 ? buckets[i - 1].count : 0;
    const nextCount = i < buckets.length - 1 ? buckets[i + 1].count : 0;

    // Flag items in a bucket that has ≤1 event, with neighbors also ≤1 event,
    // and the max bucket has many more events
    if (bucket.count <= 1 && prevCount <= 1 && nextCount <= 1 && maxCount >= 5) {
      outliers.push(...bucket.items);
    }
  }

  return outliers;
}

function suggestSplits(rows: Row[], buckets: BucketInfo[], densityRatio: number): SplitSuggestion[] {
  if (densityRatio < DENSITY_RATIO_THRESHOLD) return [];

  // Find a natural split point: the largest gap between "cluster of events" regions
  // Strategy: use bucket density to find the best split boundary
  const totalEvents = rows.length;
  if (totalEvents < MIN_EVENTS_PER_SPLIT * 2) return [];

  // Find split that maximizes the minimum of the two halves' density
  // We'll try all bucket boundaries and pick the one that gives the best balance
  let bestSplit: SplitSuggestion[] | null = null;
  let bestScore = -Infinity;

  for (let splitIdx = 1; splitIdx < buckets.length; splitIdx++) {
    const leftBuckets = buckets.slice(0, splitIdx);
    const rightBuckets = buckets.slice(splitIdx);

    const leftCount = leftBuckets.reduce((s, b) => s + b.count, 0);
    const rightCount = rightBuckets.reduce((s, b) => s + b.count, 0);

    if (leftCount < MIN_EVENTS_PER_SPLIT || rightCount < MIN_EVENTS_PER_SPLIT) continue;

    const leftSpan = leftBuckets[leftBuckets.length - 1].end - leftBuckets[0].start;
    const rightSpan = rightBuckets[rightBuckets.length - 1].end - rightBuckets[0].start;

    if (leftSpan === 0 || rightSpan === 0) continue;

    const leftDensity = leftCount / leftSpan;
    const rightDensity = rightCount / rightSpan;

    // Score: minimize the density ratio between the two halves (more balanced = better)
    const ratio = Math.max(leftDensity, rightDensity) / Math.min(leftDensity, rightDensity);
    const score = -ratio + (leftCount + rightCount); // prefer balanced splits with more events

    if (score > bestScore) {
      bestScore = score;
      const splitYear = buckets[splitIdx].start;

      const leftRows = rows.filter(r => representativeYear(r) < splitYear);
      const rightRows = rows.filter(r => representativeYear(r) >= splitYear);
      const leftMin = Math.min(...leftRows.map(r => r.start_year));
      const leftMax = Math.max(...leftRows.map(r => r.start_year));
      const rightMin = Math.min(...rightRows.map(r => r.start_year));
      const rightMax = Math.max(...rightRows.map(r => r.start_year));

      bestSplit = [
        {
          name: `Part 1 (${formatYear(leftMin)} – ${formatYear(leftMax)})`,
          startYear: leftMin,
          endYear: leftMax,
          events: leftRows.map(r => r.id as string),
          count: leftRows.length,
        },
        {
          name: `Part 2 (${formatYear(rightMin)} – ${formatYear(rightMax)})`,
          startYear: rightMin,
          endYear: rightMax,
          events: rightRows.map(r => r.id as string),
          count: rightRows.length,
        },
      ];
    }
  }

  return bestSplit ?? [];
}

function formatYear(y: number): string {
  if (y >= 0) return String(y);
  const abs = Math.abs(y);
  if (abs >= 1_000_000_000) return `${(abs / 1_000_000_000).toFixed(1)}B BCE`;
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(0)}M BCE`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(1)}K BCE`;
  return `${abs} BCE`;
}

function formatYearRange(start: number, end: number): string {
  return `${formatYear(start)} → ${formatYear(end)}`;
}

function analyzeFile(filePath: string): QuizAnalysis | null {
  let rows: Row[];
  try {
    rows = loadRows(filePath);
  } catch {
    return null;
  }

  if (rows.length === 0) return null;

  // Skip files that don't look like timeline quizzes (no start_year)
  const headers = Object.keys(rows[0]);
  if (!headers.includes('start_year')) return null;

  const years = rows.map(representativeYear);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const spanYears = maxYear - minYear;

  const buckets = buildBuckets(rows, minYear, maxYear, NUM_BUCKETS);
  const counts = buckets.map(b => b.count);
  const maxCount = Math.max(...counts);
  const minNonZeroCount = Math.min(...counts.filter(c => c > 0));
  const densityRatio = minNonZeroCount > 0 ? maxCount / minNonZeroCount : Infinity;

  const outliers = findOutliers(rows, buckets);
  const splitSuggestions = suggestSplits(rows, buckets, densityRatio);

  const name = path.relative(DATA_DIR, filePath).replace('.csv', '');

  return {
    filePath,
    name,
    totalEvents: rows.length,
    minYear,
    maxYear,
    spanYears,
    buckets,
    densityRatio,
    outliers,
    splitSuggestions,
  };
}

function renderDensityBar(count: number, maxCount: number, width: number = 20): string {
  if (maxCount === 0) return '─'.repeat(width);
  const filled = Math.round((count / maxCount) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function printAnalysis(analyses: QuizAnalysis[]): void {
  // Sort by density ratio descending (most uneven first)
  const sorted = [...analyses].sort((a, b) => {
    const aRatio = isFinite(a.densityRatio) ? a.densityRatio : 999999;
    const bRatio = isFinite(b.densityRatio) ? b.densityRatio : 999999;
    return bRatio - aRatio;
  });

  console.log('='.repeat(80));
  console.log('TIMELINE DENSITY ANALYSIS');
  console.log('='.repeat(80));
  console.log();

  for (const analysis of sorted) {
    const hasIssues = analysis.densityRatio > DENSITY_RATIO_THRESHOLD || analysis.outliers.length > 0;
    const flag = hasIssues ? '⚠️ ' : '✓  ';

    console.log(`${flag}${analysis.name}`);
    console.log(`   Events: ${analysis.totalEvents}  |  Span: ${formatYearRange(analysis.minYear, analysis.maxYear)}`);

    const maxCount = Math.max(...analysis.buckets.map(b => b.count));
    for (const bucket of analysis.buckets) {
      const bar = renderDensityBar(bucket.count, maxCount);
      const label = `${formatYear(bucket.start).padEnd(14)} – ${formatYear(bucket.end).padStart(14)}`;
      console.log(`   ${label}  ${bar}  (${bucket.count})`);
    }

    if (isFinite(analysis.densityRatio)) {
      console.log(`   Density ratio (max/min bucket): ${analysis.densityRatio.toFixed(1)}x`);
    } else {
      console.log(`   Density ratio: ∞ (some buckets empty)`);
    }

    if (analysis.outliers.length > 0) {
      console.log(`   Outlier events (isolated, consider removing):`);
      for (const id of analysis.outliers) {
        console.log(`     - ${id}`);
      }
    }

    if (analysis.splitSuggestions.length > 0) {
      console.log(`   Split suggestion:`);
      for (const s of analysis.splitSuggestions) {
        console.log(`     ${s.name}  (${s.count} events)`);
        for (const ev of s.events) {
          console.log(`       • ${ev}`);
        }
      }
    }

    console.log();
  }

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  const flagged = sorted.filter(a => a.densityRatio > DENSITY_RATIO_THRESHOLD || a.outliers.length > 0);
  const clean = sorted.filter(a => a.densityRatio <= DENSITY_RATIO_THRESHOLD && a.outliers.length === 0);
  console.log(`Flagged (uneven density or outliers): ${flagged.length}`);
  console.log(`Well-distributed: ${clean.length}`);
}

const csvFiles = findCsvFiles(DATA_DIR);
const analyses = csvFiles
  .map(analyzeFile)
  .filter((a): a is QuizAnalysis => a !== null);

printAnalysis(analyses);
