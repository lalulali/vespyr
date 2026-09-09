/**
 * Model Tier Guards — INV-TEL-05 (02l Option A, WS-03.8)
 * Audit guard for Tier B on Layer-0 architecture / threat modeling /
 * strategic verdicts. Standalone exit 2 is an AUDIT WARNING, not a release
 * block: the production hook (orchestrator_state.js recordSpanForAgent) tags
 * spans with TIER_DEMOTION and `swarm_telemetry.js verify` fails closed on
 * that tag (tier_pass:false → exit 2). Wire CI to the verify gate.
 * Usage: node tools/telemetry/modelTierGuards.js --agent architect --model flash
 * Or programmatic: checkTier(agent, modelId) => { allowed, warning }
 * Strict CI: VESPYR_TIER_STRICT=1 makes unknown-tier models on Tier-B agents
 * warn as well (default: unknown tier is conservative pass, no false positive).
 */

const TIER_B_AGENTS = new Set(['architect', 'founder', 'security-engineer', 'tech-lead']);
const TIER_A_MODELS = new Set(['gemini-2.0-flash', 'gemini-flash', 'flash', 'haiku', 'claude-3-5-haiku', 'llama-3.3-70b', 'llama', 'llama-3.1-8b', 'qwen2-8b', '8b', '70b']);
const TIER_B_MODELS = new Set(['claude-3-5-sonnet', 'claude-sonnet', 'claude-3-opus', 'sonnet', 'opus', 'gpt-4o', 'pro', 'o1', 'o1-mini', 'o3-mini', 'o3', 'mistral-pro', 'mistral-large']);

// Anchored family matchers — substring `includes('o1')` promoted
// neo1-board/photo1-model/o12/micro-o3x to Tier B. o-series tokens match only
// as standalone dash/dot-delimited segments (o1-mini ✓, o12 ✗, micro-o3x ✗).
function oSeries(id, v) {
  return new RegExp(`(^|[-_.:/ ])o${v}($|[-_.:/ ]).*$|(^|[-_.:/ ])o${v}-mini($|[-_.:/ ])`).test(id);
}
const TIER_B_PATTERNS = [
  /sonnet/,
  /opus/,
  /gpt-4o/,
  /claude-3-\d+-opus/,
  /mistral-(large|pro)/,
  /gemini-.*\b(ultra|pro)\b/,
];
const TIER_A_PATTERNS = [
  /flash/,
  /haiku/,
  /llama/,
  /(^|[-_.:/ ])8b($|[-_.:/ ])/,
  /(^|[-_.:/ ])70b($|[-_.:/ ])/,
  /qwen.*\b8b\b/,
];

function tierOf(modelId) {
  const id = (modelId||'').toLowerCase().trim();
  if (!id || id === 'unknown') return 'unknown';
  if (TIER_B_MODELS.has(id)) return 'B';
  if (TIER_A_MODELS.has(id)) return 'A';
  if (oSeries(id, '1') || oSeries(id, '3')) return 'B';
  if (TIER_B_PATTERNS.some(re => re.test(id))) return 'B';
  if (TIER_A_PATTERNS.some(re => re.test(id))) return 'A';
  return 'unknown';
}

function checkTier(agent, modelId) {
  const a = (agent||'').replace(/^@/,'').toLowerCase();
  const tier = tierOf(modelId);
  if (TIER_B_AGENTS.has(a) && tier === 'A') {
    return { allowed: false, warning: true, code: 'TIER_DEMOTION', message: `INV-TEL-05: @${a} requires Tier B frontier model, got Tier A (${modelId}). Audit warning.` };
  }
  if (TIER_B_AGENTS.has(a) && tier === 'unknown' && process.env.VESPYR_TIER_STRICT === '1') {
    return { allowed: false, warning: true, code: 'TIER_DEMOTION', message: `INV-TEL-05 strict: @${a} requires known Tier B model, got unclassified (${modelId}).` };
  }
  return { allowed: true, warning: false, code: null, message: null };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length===0) {
    console.log(`Usage:
  node tools/telemetry/modelTierGuards.js --agent <persona> --model <model_id>
  Checks INV-TEL-05 (Tier B required for @architect/@founder/@security-engineer).
  Exit 0 allowed, 2 demotion warning (TIER_DEMOTION).
  Known Tier A: flash/haiku/llama  | Tier B: sonnet/gpt-4o/o1/o3`);
    process.exit(0);
  }
  let agent=null, model=null;
  for (let i=0;i<args.length;i++) {
    if (args[i]==='--agent') { agent=args[i+1]; i++; }
    if (args[i]==='--model') { model=args[i+1]; i++; }
  }
  if (agent == null || model == null) {
    console.error('Missing required flags: --agent <persona> --model <model_id>');
    process.exit(1);
  }
  const r = checkTier(agent, model);
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.warning ? 2 : 0);
}

if (require.main===module) main();
module.exports = { checkTier, tierOf, TIER_B_AGENTS, TIER_A_MODELS, TIER_B_MODELS };
