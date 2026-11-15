#!/usr/bin/env node
// Aggregate Claude Code token usage for one build iteration from the local
// session logs (~/.claude/projects/<dir>/*.jsonl, including subagent logs in
// <session>/subagents/*.jsonl). Writes aggregated numbers only to
// docs/metrics/usage.json; no raw log content or local paths are written.
//
// Usage:
//   npm run usage-report -- [--label iteration-1] [--from ISO] [--to ISO] [--dir PATH]
//
// Defaults: the label is the last iteration in docs/metrics/timeline.json;
// --from is its first_prompt_at (else started_at), --to its ready_at (or now). Segments listed in the
// timeline iteration (`segments: [{ name, from, to }]`) are reported too.
// Costs are computed from docs/metrics/pricing.json when it has the model.
//
// Log format notes (verified against real files): each line is a JSON object;
// assistant replies have type "assistant", `message.model`, `message.id`,
// `message.usage` and `timestamp`. One API response can be logged as several
// lines (one per content block) that repeat the same message.id and usage, so
// usage is counted once per message.id. Subagent lines have isSidechain: true.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const metricsDir = join(root, 'docs', 'metrics');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
const timeline = readJson(join(metricsDir, 'timeline.json'), { iterations: [] });
const label = arg('label') ?? timeline.iterations.at(-1)?.label ?? 'iteration-1';
const iteration = timeline.iterations.find((i) => i.label === label) ?? {};
// Count from the first prompt when recorded (the clock start is noted a few
// seconds later, after the first reply).
const from = new Date(arg('from') ?? iteration.first_prompt_at ?? iteration.started_at);
const to = new Date(arg('to') ?? iteration.ready_at ?? Date.now());
if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
  console.error('Need a valid --from and --to (or a timeline with started_at).');
  process.exit(1);
}

// Claude Code names a project's log folder after its working directory with
// every non-alphanumeric character replaced by "-". The build may have been
// started in this folder or in its parent, so look for both.
const projectsRoot = join(homedir(), '.claude', 'projects');
const candidates = arg('dir')
  ? [resolve(arg('dir'))]
  : [root, dirname(root)].map((p) => join(projectsRoot, p.replace(/[^a-zA-Z0-9]/g, '-')));
const dirs = candidates.filter((d) => existsSync(d));
if (dirs.length === 0) {
  console.error('No Claude Code log folder found for this project.');
  process.exit(1);
}

function* jsonlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* jsonlFiles(p);
    else if (name.endsWith('.jsonl')) yield p;
  }
}

const pricing = readJson(join(metricsDir, 'pricing.json'), null);
const emptyBucket = () => ({
  messages: 0,
  input_tokens: 0,
  output_tokens: 0,
  cache_write_tokens: 0,
  cache_write_5m_tokens: 0,
  cache_write_1h_tokens: 0,
  cache_read_tokens: 0,
});

// Collect unique assistant messages in range.
const seen = new Map();
let files = 0;
let sidechainMessages = 0;
for (const dir of dirs) {
  for (const file of jsonlFiles(dir)) {
    files += 1;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let o;
      try {
        o = JSON.parse(line);
      } catch {
        continue;
      }
      if (o.type !== 'assistant' || !o.message?.usage) continue;
      const t = new Date(o.timestamp);
      if (!(t >= from && t <= to)) continue;
      const id = o.message.id ?? o.requestId ?? o.uuid;
      if (seen.has(id)) continue;
      if (o.isSidechain) sidechainMessages += 1;
      seen.set(id, { model: o.message.model ?? 'unknown', usage: o.message.usage, at: t });
    }
  }
}

function add(bucket, u) {
  bucket.messages += 1;
  bucket.input_tokens += u.input_tokens ?? 0;
  bucket.output_tokens += u.output_tokens ?? 0;
  const cw = u.cache_creation_input_tokens ?? 0;
  const cw1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const cw5m = u.cache_creation?.ephemeral_5m_input_tokens ?? cw - cw1h;
  bucket.cache_write_tokens += cw;
  bucket.cache_write_5m_tokens += cw5m;
  bucket.cache_write_1h_tokens += cw1h;
  bucket.cache_read_tokens += u.cache_read_input_tokens ?? 0;
}

function cost(model, b) {
  const rate = pricing?.models?.[model];
  if (!rate) return null;
  const per = (tokens, usdPerMTok) => (tokens / 1e6) * usdPerMTok;
  const parts = {
    input: per(b.input_tokens, rate.input),
    output: per(b.output_tokens, rate.output),
    cache_write_5m: per(b.cache_write_5m_tokens, rate.cache_write_5m),
    cache_write_1h: per(b.cache_write_1h_tokens, rate.cache_write_1h),
    cache_read: per(b.cache_read_tokens, rate.cache_read),
  };
  const round = (n) => Math.round(n * 10000) / 10000;
  const total = Object.values(parts).reduce((a, c) => a + c, 0);
  return {
    ...Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, round(v)])),
    total: round(total),
  };
}

function summarise(start, end) {
  const models = {};
  for (const m of seen.values()) {
    if (m.at < start || m.at > end) continue;
    add((models[m.model] ??= emptyBucket()), m.usage);
  }
  const totals = emptyBucket();
  let totalCost = 0;
  let costComplete = true;
  for (const [model, b] of Object.entries(models)) {
    for (const k of Object.keys(totals)) totals[k] += b[k];
    b.cost_usd = cost(model, b);
    if (b.cost_usd) totalCost += b.cost_usd.total;
    else costComplete = false;
  }
  totals.all_tokens =
    totals.input_tokens +
    totals.output_tokens +
    totals.cache_write_tokens +
    totals.cache_read_tokens;
  return {
    from: start.toISOString(),
    to: end.toISOString(),
    models,
    totals,
    cost_usd: pricing ? Math.round(totalCost * 100) / 100 : null,
    cost_complete: pricing ? costComplete : false,
  };
}

const entry = {
  label,
  generated_at: new Date().toISOString(),
  ...summarise(from, to),
  segments: (iteration.segments ?? []).map((s) => ({
    name: s.name,
    ...summarise(new Date(s.from), new Date(s.to ?? to)),
  })),
  method: {
    log_files_scanned: files,
    unique_assistant_messages: seen.size,
    of_which_subagent_messages: sidechainMessages,
    dedupe_key: 'message.id',
    pricing_source: pricing ? { url: pricing.source_url, retrieved: pricing.retrieved } : null,
  },
};

const outPath = join(metricsDir, 'usage.json');
const out = readJson(outPath, { iterations: {} });
out.iterations[label] = entry;
// Running total across all recorded iterations.
const running = emptyBucket();
let runningCost = 0;
for (const it of Object.values(out.iterations)) {
  for (const k of Object.keys(running)) running[k] += it.totals[k];
  runningCost += it.cost_usd ?? 0;
}
running.all_tokens =
  running.input_tokens +
  running.output_tokens +
  running.cache_write_tokens +
  running.cache_read_tokens;
out.running_total = {
  iterations: Object.keys(out.iterations),
  ...running,
  cost_usd: Math.round(runningCost * 100) / 100,
};
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');

const fmt = (n) => n.toLocaleString('en-US');
console.log(`${label}: ${entry.from} → ${entry.to}`);
for (const [model, b] of Object.entries(entry.models)) {
  console.log(
    `  ${model}: ${b.messages} msgs, in ${fmt(b.input_tokens)}, out ${fmt(b.output_tokens)}, ` +
      `cache write ${fmt(b.cache_write_tokens)}, cache read ${fmt(b.cache_read_tokens)}` +
      (b.cost_usd ? `, $${b.cost_usd.total.toFixed(2)}` : ''),
  );
}
console.log(`  total tokens ${fmt(entry.totals.all_tokens)}, cost ${entry.cost_usd ?? 'n/a'} USD`);
console.log(`Wrote docs/metrics/usage.json`);
