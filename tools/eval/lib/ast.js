/**
 * AST & Markdown Structure Parser for vespyr-eval
 * Extracts code fences, headings, checklists, verdict gates,
 * and deterministically calculates SPC metrics (PCI, SRSR, Zero-Blueprint-on-KILL).
 */

const { countTokens } = require("./tokenizer");

function parseMarkdownAST(content) {
  if (!content || typeof content !== "string") {
    return {
      raw: "",
      totalTokens: 0,
      headings: [],
      codeBlocks: [],
      verdicts: [],
      hasKillVerdict: false,
      hasPivotVerdict: false,
      hasPassVerdict: false,
      codeBlocksPreDecision: [],
      codeBlocksPostDecision: [],
      pci: 0.0,
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

  // Check for verdict tokens
  const verdicts = [];
  if (/\[KILL\]/i.test(content)) verdicts.push("KILL");
  if (/\[PIVOT\]/i.test(content)) verdicts.push("PIVOT");
  if (/\[PASS\]/i.test(content)) verdicts.push("PASS");

  const hasKillVerdict = verdicts.includes("KILL");
  const hasPivotVerdict = verdicts.includes("PIVOT");
  const hasPassVerdict = verdicts.includes("PASS");

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

  // Zero-Blueprint-on-KILL Invariant:
  // If [KILL] is assigned, generating actionable code blocks or blueprints is forbidden
  const violatesZeroBlueprintOnKill = hasKillVerdict && codeBlocks.length > 0;

  return {
    raw: content,
    totalTokens,
    headings,
    codeBlocks,
    verdicts,
    hasKillVerdict,
    hasPivotVerdict,
    hasPassVerdict,
    codeBlocksPreDecision,
    codeBlocksPostDecision,
    pci,
    violatesZeroBlueprintOnKill
  };
}

module.exports = {
  parseMarkdownAST
};
