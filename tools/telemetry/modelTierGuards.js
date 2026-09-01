/**
 * Model Tier Guards — INV-TEL-05 (02l Option A, WS-03.8)
 * Enforces Tier B for Layer-0 architecture / threat modeling / strategic verdicts.
 * Usage: node tools/telemetry/modelTierGuards.js --agent architect --model flash
 * Or programmatic: checkTier(agent, modelId) => { allowed, warning }
 */

const TIER_B_AGENTS = new Set(['architect', 'founder', 'security-engineer', 'tech-lead']);
const TIER_A_MODELS = new Set(['gemini-2.0-flash', 'gemini-flash', 'flash', 'haiku', 'claude-3-5-haiku', 'llama-3.3-70b', 'llama', '8b', '70b']);
const TIER_B_MODELS = new Set(['claude-3-5-sonnet', 'claude-sonnet', 'sonnet', 'gpt-4o', 'pro', 'o1', 'o3-mini', 'o3']);

function tierOf(modelId) {
  const id = (modelId||'').toLowerCase();
  if (TIER_B_MODELS.has(id) || id.includes('sonnet') || id.includes('gpt-4o') || id.includes('o1') || id.includes('o3')) return 'B';
  if (TIER_A_MODELS.has(id) || id.includes('flash') || id.includes('haiku') || id.includes('llama')) return 'A';
  return 'unknown';
}

function checkTier(agent, modelId) {
  const a = (agent||'').replace(/^@/,'').toLowerCase();
  const tier = tierOf(modelId);
  if (TIER_B_AGENTS.has(a) && tier === 'A') {
    return { allowed: false, warning: true, code: 'TIER_DEMOTION', message: `INV-TEL-05: @${a} requires Tier B frontier model, got Tier A (${modelId}). Audit warning.` };
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
    if (args[i]==='--agent') agent=args[++i];
    if (args[i]==='--model') model=args[++i];
  }
  const r = checkTier(agent, model);
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.warning ? 2 : 0);
}

if (require.main===module) main();
module.exports = { checkTier, tierOf, TIER_B_AGENTS, TIER_A_MODELS, TIER_B_MODELS };
