#!/usr/bin/env node
// Append an event to docs/metrics/timeline.json.
// Usage:
//   node scripts/timeline.mjs event <phase> <start|end|note> [note]
//   node scripts/timeline.mjs mark <deployed_at|ready_at>
//   node scripts/timeline.mjs delegate-start <id> <model> <purpose>
//   node scripts/timeline.mjs delegate-end <id>
// Optional env ITERATION (default: last iteration in the file).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../docs/metrics/timeline.json', import.meta.url));
const data = JSON.parse(readFileSync(file, 'utf8'));
const label = process.env.ITERATION;
const it = label ? data.iterations.find((i) => i.label === label) : data.iterations.at(-1);
if (!it) throw new Error(`Unknown iteration ${label}`);
const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case 'event': {
    const [phase, event, ...note] = args;
    it.events.push({ at: now, phase, event, ...(note.length ? { note: note.join(' ') } : {}) });
    break;
  }
  case 'mark':
    it[args[0]] = now;
    it.events.push({ at: now, phase: 'milestone', event: args[0] });
    break;
  case 'delegate-start': {
    const [id, model, ...purpose] = args;
    it.delegations.push({ id, model, purpose: purpose.join(' '), start: now, end: null });
    break;
  }
  case 'delegate-end': {
    const d = it.delegations.find((x) => x.id === args[0] && !x.end);
    if (!d) throw new Error(`No open delegation ${args[0]}`);
    d.end = now;
    break;
  }
  default:
    console.error('Unknown command');
    process.exit(1);
}
writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log(`${cmd} ${args.join(' ')} @ ${now}`);
