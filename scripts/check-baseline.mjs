#!/usr/bin/env node
/**
 * Baseline support gate for the shipped CSS.
 *
 * Scans the canonical CSS source modules, resolves every platform feature they
 * use against the W3C WebDX Baseline dataset, and fails if anything sits below
 * the declared floor without an explicit, justified exemption. The point is to
 * turn `@supports` guards from author judgement into enforced policy.
 *
 * Two datasets, two jobs:
 *
 *   - `@mdn/browser-compat-data` is the *oracle for what a token is*. Rather
 *     than hand-maintain a list of CSS properties, selectors, at-rules and
 *     functions to look for, we index BCD's own trees and only emit a compat
 *     key when BCD says that key exists. A typo, a vendor prefix, or a token
 *     we have never heard of produces no key instead of a false positive.
 *
 *   - `web-features` supplies the Baseline verdict for each key.
 *
 * Resolution is deliberately at *compat-key* granularity, not feature
 * granularity. A `web-features` entry's top-level `status.baseline` is the
 * minimum across every compat key it bundles, so one lagging sub-feature drags
 * the whole feature down: `anchor-positioning` reports `false` purely because
 * `css.properties.position-visibility.anchor-valid` has no support anywhere,
 * even though `css.properties.position-area` -- the thing we actually use --
 * reached Baseline on 2026-01-13. Asking `status.by_compat_key[key]` first asks
 * the precise question.
 *
 * Usage:
 *   node scripts/check-baseline.mjs               # gate; exit 1 on violation
 *   node scripts/check-baseline.mjs --list        # full inventory, always exit 0
 *   node scripts/check-baseline.mjs --json        # machine-readable report
 *   node scripts/check-baseline.mjs --css-dir=DIR # scan CSS from elsewhere
 *
 * `--css-dir` exists so an unmerged branch can be checked before it lands:
 *   git show BRANCH:fastblocks_ui/static/css/components.css > /tmp/css/components.css
 *   node scripts/check-baseline.mjs --css-dir=/tmp/css
 * Finding out that a branch breaks the floor after the merge is strictly worse.
 */

import bcd from '@mdn/browser-compat-data' with { type: 'json' };
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { features } from 'web-features';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS_DIR = join(REPO_ROOT, 'fastblocks_ui', 'static', 'css');
const ALLOWLIST_PATH = join(REPO_ROOT, '.baseline-allowlist.json');

// Canonical source modules only. `fastblocks-ui.css` is generated from these by
// tools/build_css.py, so scanning it would double-report every finding.
const MODULES = [
  'tokens.css',
  'theme.css',
  'base.css',
  'utilities.css',
  'components.css',
  'layout.css',
];

// A Baseline verdict is one of: "high" (Widely available), "low" (Newly
// available), or false (not Baseline). The floor names which pass unguarded.
const FLOORS = {
  widely: new Set(['high']),
  newly: new Set(['high', 'low']),
};

const IDENT = '[a-zA-Z][a-zA-Z0-9-]*';

/* ------------------------------------------------------------------ *
 * Dataset indexes
 * ------------------------------------------------------------------ */

/**
 * Collect every leaf compat key under a BCD subtree, keyed by dotted path.
 * BCD marks real compat nodes with `__compat`; everything else is a namespace.
 */
function collectKeys(node, prefix, out) {
  for (const [name, child] of Object.entries(node ?? {})) {
    if (name === '__compat' || !child || typeof child !== 'object') {
      continue;
    }
    const key = `${prefix}.${name}`;
    if (child.__compat) {
      out.add(key);
    }
    collectKeys(child, key, out);
  }
}

function buildFeatureIndex() {
  const index = new Map();
  for (const [id, feature] of Object.entries(features)) {
    for (const key of feature.compat_features ?? []) {
      index.set(key, id);
    }
  }
  return index;
}

/** CSS function/type names BCD knows, indexed by leaf name (`color-mix`, ...). */
function buildTypeIndex() {
  const keys = new Set();
  collectKeys(bcd.css?.types, 'css.types', keys);
  const index = new Map();
  for (const key of keys) {
    const leaf = key.split('.').pop();
    if (!index.has(leaf)) {
      index.set(leaf, []);
    }
    index.get(leaf).push(key);
  }
  return index;
}

const featureIndex = buildFeatureIndex();
const typeIndex = buildTypeIndex();
const propertyKeys = new Set();
const selectorKeys = new Set();
const atRuleKeys = new Set();
collectKeys(bcd.css?.properties, 'css.properties', propertyKeys);
collectKeys(bcd.css?.selectors, 'css.selectors', selectorKeys);
collectKeys(bcd.css?.['at-rules'], 'css.at-rules', atRuleKeys);

/**
 * Baseline status for a compat key, preferring the per-key verdict.
 * Returns null when the key maps to no web-features entry (nothing to assert).
 */
function statusFor(key) {
  const id = featureIndex.get(key);
  if (!id) {
    return null;
  }
  const feature = features[id];
  const perKey = feature.status?.by_compat_key?.[key];
  const status = perKey ?? feature.status;
  return {
    id,
    name: feature.name,
    baseline: status?.baseline ?? false,
    lowDate: status?.baseline_low_date ?? null,
    perKey: Boolean(perKey),
  };
}

/* ------------------------------------------------------------------ *
 * CSS scanning
 * ------------------------------------------------------------------ */

/** Blank out comments while preserving line numbering. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '));
}

/**
 * Split a stylesheet into prelude/declaration chunks with brace depth.
 *
 * A character walk rather than a line walk, because declarations here wrap
 * across lines (`transition:` with one value per line is the common case) and a
 * line-oriented scanner silently drops them -- a gate that misses features is
 * worse than no gate.
 */
function* chunks(css) {
  let buffer = '';
  let line = 1;
  let startLine = 1;

  for (const char of css) {
    if (char === '\n') {
      line += 1;
    }
    if (char === '{' || char === '}' || char === ';') {
      const text = buffer.trim();
      if (text || char !== ';') {
        yield { kind: char, text, line: startLine };
      }
      buffer = '';
      startLine = line;
      continue;
    }
    if (!buffer.trim() && !char.trim()) {
      startLine = line;
    }
    buffer += char;
  }
}

/** Return `key` when BCD knows it, else null. */
function known(key, set) {
  return set.has(key) ? key : null;
}

/** Walk a stylesheet and collect every (compat key, line, guarded) usage. */
function scanStylesheet(css, file) {
  const usages = [];
  // One frame per open brace; the frame is `true` for a brace opened by an
  // `@supports` prelude. Any `true` in scope means the usage is guarded --
  // which is what makes this work inside `@layer`, where every rule in this
  // codebase already sits two blocks deep.
  const guards = [];
  const guarded = () => guards.some(Boolean);

  const record = (key, line) => {
    if (key) {
      usages.push({ key, file, line, guarded: guarded() });
    }
  };

  const scanPrelude = (text, line) => {
    for (const match of text.matchAll(new RegExp(`@(${IDENT})`, 'g'))) {
      record(known(`css.at-rules.${match[1]}`, atRuleKeys), line);
    }
    // Pseudo-classes / pseudo-elements, only on non-at-rule preludes so an
    // `@media (min-width: …)` condition is never read as a selector.
    if (!text.trimStart().startsWith('@')) {
      for (const match of text.matchAll(new RegExp(`::?(${IDENT})`, 'g'))) {
        record(known(`css.selectors.${match[1]}`, selectorKeys), line);
      }
    }
  };

  const scanDeclaration = (text, line) => {
    const match = text.match(new RegExp(`^(--${IDENT}|${IDENT})\\s*:\\s*([\\s\\S]+)$`));
    if (!match) {
      // Statement at-rules with no block, e.g. `@layer base, tokens;`.
      scanPrelude(text, line);
      return;
    }
    const [, prop, value] = match;
    if (!prop.startsWith('--')) {
      const propKey = `css.properties.${prop}`;
      if (propertyKeys.has(propKey)) {
        record(propKey, line);
        // Value keywords, but only where the value is its OWN web-feature.
        //
        // BCD tracks per-value support, and those records are patchily
        // populated: `css.properties.cursor.pointer` reports not-Baseline
        // solely because no `safari_ios` version was ever recorded for it.
        // Reporting that would force a meaningless allowlist entry.
        //
        // When a value maps to the same feature as its property, the property's
        // own verdict already covers it and the sub-key adds nothing. When it
        // maps to a *different* feature it is genuinely separate signal --
        // `text-wrap: balance` is Baseline while `text-wrap: pretty` is not,
        // and only the value-level key can tell them apart.
        const parentFeature = featureIndex.get(propKey);
        for (const word of value.matchAll(new RegExp(IDENT, 'g'))) {
          const valueKey = `${propKey}.${word[0]}`;
          if (propertyKeys.has(valueKey) && featureIndex.get(valueKey) !== parentFeature) {
            record(valueKey, line);
          }
        }
      }
    }
    // Value functions: color-mix(), oklch(), light-dark(), ...
    for (const fn of value.matchAll(new RegExp(`(${IDENT})\\(`, 'g'))) {
      for (const key of typeIndex.get(fn[1]) ?? []) {
        if (featureIndex.has(key)) {
          record(key, line);
        }
      }
    }
  };

  for (const chunk of chunks(stripComments(css))) {
    if (chunk.kind === '{') {
      scanPrelude(chunk.text, chunk.line);
      guards.push(/^\s*@supports\b/.test(chunk.text));
    } else if (chunk.kind === '}') {
      if (chunk.text) {
        scanDeclaration(chunk.text, chunk.line);
      }
      guards.pop();
    } else if (chunk.text) {
      scanDeclaration(chunk.text, chunk.line);
    }
  }

  return usages;
}

/* ------------------------------------------------------------------ *
 * Allowlist
 * ------------------------------------------------------------------ */

function loadAllowlist() {
  try {
    return JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { floor: 'newly', allow: [] };
    }
    throw error;
  }
}

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

function collapse(usages) {
  const byKey = new Map();
  for (const usage of usages) {
    let row = byKey.get(usage.key);
    if (!row) {
      row = { key: usage.key, uses: 0, unguarded: [], guarded: 0 };
      byKey.set(usage.key, row);
    }
    row.uses += 1;
    if (usage.guarded) {
      row.guarded += 1;
    } else {
      row.unguarded.push(`${usage.file}:${usage.line}`);
    }
  }
  return byKey;
}

function checkAllowlistHygiene(allowlist, byKey, passing, floorName, today, errors) {
  // An exemption that is no longer earning its keep is a silent lie about the
  // support policy, so it fails the build like any other violation.
  for (const entry of allowlist.allow) {
    const status = statusFor(entry.key);
    if (!byKey.has(entry.key)) {
      errors.push(
        `.baseline-allowlist.json exempts ${entry.key}, but no CSS module uses it. Remove the entry.`,
      );
      continue;
    }
    if (status && passing.has(status.baseline)) {
      const when = status.lowDate ? `, ${status.lowDate}` : '';
      errors.push(
        `.baseline-allowlist.json exempts ${entry.key}, but it now meets the ` +
          `${floorName} floor (${status.baseline}${when}). Remove the entry.`,
      );
    }
    if (entry.reviewBy && entry.reviewBy < today) {
      errors.push(
        `.baseline-allowlist.json entry for ${entry.key} was due for review on ` +
          `${entry.reviewBy}. Re-verify against the current dataset and update reviewBy.`,
      );
    }
    for (const field of ['reason', 'degradation', 'reviewBy']) {
      if (!entry[field]) {
        errors.push(`.baseline-allowlist.json entry for ${entry.key} is missing "${field}".`);
      }
    }
  }
}

function main() {
  const args = new Set(process.argv.slice(2));
  const allowlist = loadAllowlist();
  const floorName = allowlist.floor ?? 'newly';
  const passing = FLOORS[floorName];
  if (!passing) {
    console.error(
      `Unknown floor ${JSON.stringify(floorName)}; expected one of ${Object.keys(FLOORS).join(', ')}.`,
    );
    return 1;
  }

  const dirArg = [...args].find((arg) => arg.startsWith('--css-dir='));
  const cssDir = dirArg ? dirArg.slice('--css-dir='.length) : CSS_DIR;

  const usages = [];
  for (const name of MODULES) {
    usages.push(...scanStylesheet(readFileSync(join(cssDir, name), 'utf8'), name));
  }

  const byKey = collapse(usages);
  const allowed = new Set(allowlist.allow.map((entry) => entry.key));
  const today = new Date().toISOString().slice(0, 10);
  const errors = [];
  const inventory = [];

  const rows = [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  for (const row of rows) {
    const status = statusFor(row.key);
    if (!status) {
      continue;
    }
    inventory.push({ ...row, status });
    if (passing.has(status.baseline) || row.unguarded.length === 0 || allowed.has(row.key)) {
      continue;
    }
    errors.push(
      `${row.key} is not Baseline (feature: ${status.id}) and is used unguarded at ` +
        `${row.unguarded.slice(0, 3).join(', ')}. Wrap it in @supports, or add an ` +
        `entry to .baseline-allowlist.json explaining why the degradation is inert.`,
    );
  }

  checkAllowlistHygiene(allowlist, byKey, passing, floorName, today, errors);

  const datasetVersion = JSON.parse(
    readFileSync(join(REPO_ROOT, 'node_modules', 'web-features', 'package.json'), 'utf8'),
  ).version;

  if (args.has('--json')) {
    console.log(JSON.stringify({ floor: floorName, datasetVersion, errors, inventory }, null, 2));
    return errors.length ? 1 : 0;
  }

  if (args.has('--list')) {
    console.log(`Baseline inventory (floor: ${floorName}, web-features ${datasetVersion})\n`);
    for (const row of inventory) {
      const verdict = row.status.baseline === false ? 'NOT-BASELINE' : row.status.baseline;
      const guard = row.unguarded.length === 0 ? '  [all guarded]' : '';
      const exempt = allowed.has(row.key) ? '  [allowlisted]' : '';
      console.log(
        `  ${verdict.padEnd(12)} ${row.key.padEnd(48)} ${String(row.uses).padStart(3)}x${guard}${exempt}`,
      );
    }
    return 0;
  }

  console.log(
    `check-baseline: ${byKey.size} feature keys across ${MODULES.length} modules ` +
      `(floor: ${floorName}, web-features ${datasetVersion})`,
  );

  if (errors.length) {
    console.error('\nBaseline policy violations:\n');
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    console.error('');
    return 1;
  }

  console.log('check-baseline: OK');
  return 0;
}

process.exit(main());
