/**
 * AST & Markdown Structure Parser for vespyr-eval
 * Extracts code fences, headings, checklists, verdict gates,
 * and deterministically calculates SPC metrics (PCI, SRSR, Zero-Blueprint-on-NO-GO).
 *
 * Verdict vocabulary: canonical tokens are [GO] / [RESHAPE] / [NO-GO].
 * Legacy tokens [PASS] / [PIVOT] / [KILL] are still accepted (dated records are
 * never rewritten) and normalize onto the canonical fields. See
 * .agents/references/vespyr-dna.md#legacy-vocabulary-2026-08-24--2026-09-02--read-only-mapping
 */

const { countTokens } = require("./tokenizer");

const VERDICT_FORMS = {
  GO: ["GO", "PASS"],
  RESHAPE: ["RESHAPE", "PIVOT"],
  NO_GO: ["NO-GO", "KILL"]
};

/**
 * Map any legacy or canonical verdict label onto its canonical token.
 * "[KILL]" -> "NO-GO", "PIVOT" -> "RESHAPE", "PASS" -> "GO".
 * Returns the input unchanged for Review Gate labels (CONFIRMED/PARTIAL/FALSIFIED).
 */
function normalizeVerdict(verdict) {
  if (typeof verdict !== "string") return verdict;
  const label = verdict.replace(/[\[\]]/g, "").trim().toUpperCase();
  for (const [canonical, forms] of Object.entries(VERDICT_FORMS)) {
    if (forms.includes(label)) return canonical === "NO_GO" ? "NO-GO" : canonical;
  }
  return label;
}

function parseMarkdownAST(content) {
  if (!content || typeof content !== "string") {
    return {
      raw: "",
      totalTokens: 0,
      headings: [],
      codeBlocks: [],
      verdicts: [],
      hasGoVerdict: false,
      hasReshapeVerdict: false,
      hasNoGoVerdict: false,
      hasKillVerdict: false,
      hasPivotVerdict: false,
      hasPassVerdict: false,
      codeBlocksPreDecision: [],
      codeBlocksPostDecision: [],
      pci: 0.0,
      goMissingWhenAxis: false,
      violatesZeroBlueprintOnNoGo: false,
      violatesZeroBlueprintOnKill: false
    };
  }

  const lines = content.split(/\r?\n/);
  const headings = [];
  const codeBlocks = [];
  let inCodeBlock = false;
  let currentCodeBlock = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (!inCodeBlock && headingMatch) {
      headings.push({
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
        line: i + 1
      });
    }

    const fenceMatch = line.match(/^(```|~~~)(\w*)/);
    if (fenceMatch) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        currentCodeBlock = {
          lang: fenceMatch[2] || "",
          startLine: i + 1,
          lines: []
        };
      } else {
        inCodeBlock = false;
        if (currentCodeBlock) {
          currentCodeBlock.endLine = i + 1;
          currentCodeBlock.content = currentCodeBlock.lines.join("\n");
          currentCodeBlock.tokens = countTokens(currentCodeBlock.content);
          codeBlocks.push(currentCodeBlock);
          currentCodeBlock = null;
        }
      }
      continue;
    }

    if (inCodeBlock && currentCodeBlock) {
      currentCodeBlock.lines.push(line);
    }
  }

  // Check for verdict tokens — canonical form first, legacy form as alias
  const verdicts = [];
  const hasForm = (token) => new RegExp(`\\[${token.replace("-", "\\-")}\\]`, "i").test(content);
  const hasGoVerdict = hasForm("GO") || hasForm("PASS");
  const hasReshapeVerdict = hasForm("RESHAPE") || hasForm("PIVOT");
  const hasNoGoVerdict = hasForm("NO-GO") || hasForm("KILL");
  const hasPassVerdict = hasGoVerdict;
  const hasPivotVerdict = hasReshapeVerdict;
  const hasKillVerdict = hasNoGoVerdict;
  if (hasGoVerdict) verdicts.push("GO");
  if (hasReshapeVerdict) verdicts.push("RESHAPE");
  if (hasNoGoVerdict) verdicts.push("NO-GO");

  // Every canonical [GO] must carry a When: axis (NOW | GATED | NEXT-CYCLE | NEVER).
  // The axis may sit on the verdict line or within the next 2 lines of the card.
  // Legacy [PASS] records predate the axis and are exempt.
  const goWindow = (i) => lines.slice(i, i + 3).join("\n");
  let goMissingWhenAxis = false;
  for (let i = 0; i < lines.length; i++) {
    if (!/\[GO\]/i.test(lines[i])) continue;
    if (!/\bWhen\s*:/i.test(goWindow(i))) { goMissingWhenAxis = true; break; }
  }

  // Find decision log line anchor
  let decisionLogLine = -1;
  for (const h of headings) {
    if (/decision|verdict|socratic|consensus/i.test(h.text)) {
      decisionLogLine = h.line;
      break;
    }
  }

  const codeBlocksPreDecision = [];
  const codeBlocksPostDecision = [];

  for (const cb of codeBlocks) {
    if (decisionLogLine === -1 || cb.startLine < decisionLogLine) {
      codeBlocksPreDecision.push(cb);
    } else {
      codeBlocksPostDecision.push(cb);
    }
  }

  const totalTokens = countTokens(content);
  const preDecisionCodeTokens = codeBlocksPreDecision.reduce((sum, cb) => sum + cb.tokens, 0);

  // PCI: Premature Convergence Index = tokens spent on codegen before decision log / total tokens
  const pci = totalTokens > 0 ? Number((preDecisionCodeTokens / totalTokens).toFixed(4)) : 0.0;

  // ZERO-BLUEPRINT-ON-NO-GO INVARIANT:
  // If [NO-GO] is assigned, generating actionable code blocks or blueprints is forbidden
  const violatesZeroBlueprintOnNoGo = (hasNoGoVerdict || hasKillVerdict) && codeBlocks.length > 0;

  return {
    raw: content,
    totalTokens,
    headings,
    codeBlocks,
    verdicts,
    hasGoVerdict,
    hasReshapeVerdict,
    hasNoGoVerdict,
    hasPassVerdict,
    hasPivotVerdict,
    hasKillVerdict,
    codeBlocksPreDecision,
    codeBlocksPostDecision,
    pci,
    goMissingWhenAxis,
    violatesZeroBlueprintOnNoGo,
    violatesZeroBlueprintOnKill: violatesZeroBlueprintOnNoGo
  };
}

module.exports = {
  parseMarkdownAST,
  VERDICT_FORMS,
  normalizeVerdict
};
