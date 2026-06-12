#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const VERSION = "1.7.0";
const AGENTS_SRC = path.join(__dirname, "..", ".agents");

const ASCII_ART = `  __  __
 /\\ \\/\\ \\
 \\ \\ \\ \\ \\     __    ____  _____   __  __  _ __
  \\ \\ \\ \\ \\  /'__\` /',__\\/\\ '__\`\\/\\ \\/\\ \\/\\\`'__\\
   \\ \\ \\_/ \\/\\  __//\\__, \`\\ \\ \\L\\ \\ \\ \\_\\ \\ \\ \\/
    \\ \`\\___/\\ \\____\\/\\____/\\ \\ ,__/\\/\`____ \\ \\_\\
     \`\\/__/  \\/____/\\/___/  \\ \\ \\/  \`/___/> \\/_/
                             \\ \\_\\     /\\___/
                              \\/_/     \\/__/`;

const HARNESS_OPTIONS = [
  {
    id: "opencode",
    label: "opencode",
    description: "scaffolds .opencode -> .agents symlink",
  },
  {
    id: "claude",
    label: "Claude Code",
    description: "scaffolds .claude -> .agents symlink + CLAUDE.md",
  },
  {
    id: "cursor",
    label: "Cursor Rules",
    description: "scaffolds .cursor/rules/*.mdc rules with metadata",
  },
  {
    id: "github",
    label: "GitHub Copilot & CLI",
    description: "scaffolds .github/agents/*.yml compiled rules",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    description:
      "scaffolds .windsurf/workflows symlink & .windsurfrules symlink",
  },
  {
    id: "kiro",
    label: "Kiro Steering",
    description: "scaffolds .kiro/steering/ manual rule folder",
  },
];

let createdLinks = [];
let installed = false;
let dryRun = false;

function log(msg) {
  console.log(msg);
}

function logDry(msg) {
  if (dryRun) {
    console.log(`[DRY RUN] ${msg}`);
  }
}

function logError(msg) {
  console.error(`Error: ${msg}`);
}

function logWarn(msg) {
  console.warn(`  ⚠ ${msg}`);
}

function parseFlags(argv) {
  const args = argv.slice(2);
  const flags = {
    dryRun: false,
    yes: false,
    target: null,
    harnesses: [],
    version: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      flags.dryRun = true;
    } else if (arg === "--yes" || arg === "-y") {
      flags.yes = true;
    } else if (arg === "--target") {
      flags.target = args[++i] || null;
    } else if (arg === "--harness") {
      const val = args[++i] || "";
      flags.harnesses = val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === "--version" || arg === "-v") {
      flags.version = true;
    } else if (arg === "--help" || arg === "-h") {
      flags.help = true;
    } else {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    }
  }

  return flags;
}

function detectState(targetDir) {
  const opencodePath = path.join(targetDir, ".opencode");
  const agentsPath = path.join(targetDir, ".agents");

  const opencodeExists = fs.existsSync(opencodePath);
  const agentsExists = fs.existsSync(agentsPath);

  if (agentsExists) {
    return "installed";
  }

  if (opencodeExists) {
    try {
      const stat = fs.lstatSync(opencodePath);
      if (!stat.isSymbolicLink()) {
        return "migrate";
      }
    } catch (e) {
      // ignore
    }
  }

  return "fresh";
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, body: content };

  const data = {};
  const lines = match[1].split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const kv = trimmed.match(/^(\w[\w\s]*?):\s*(.*)$/);
    if (kv) {
      const key = kv[1].trim();
      let val = kv[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      data[key] = val;
    }
  }

  return { data, body: content.substring(match[0].length).trim() };
}

function createLinkOrCopy(target, linkPath, type = "dir", method = "symlink") {
  if (dryRun) {
    logDry(`Would create ${type} ${method}: ${linkPath} -> ${target}`);
    return;
  }

  if (method === "copy") {
    if (type === "dir") {
      fs.cpSync(target, linkPath, { recursive: true });
    } else {
      fs.copyFileSync(target, linkPath);
    }
  } else {
    if (fs.existsSync(linkPath)) {
      try {
        const stat = fs.lstatSync(linkPath);
        if (stat.isSymbolicLink()) {
          const existing = fs.readlinkSync(linkPath);
          if (
            existing === target ||
            existing === path.relative(path.dirname(linkPath), target)
          ) {
            return;
          }
        }
      } catch (e) {
        /* ignore */
      }
    }

    try {
      fs.symlinkSync(target, linkPath, type);
      createdLinks.push(linkPath);
    } catch (err) {
      if (
        err.code === "EPERM" &&
        type === "file" &&
        process.platform === "win32"
      ) {
        fs.copyFileSync(target, linkPath);
        logWarn(`Symlink failed, copied file instead: ${linkPath}`);
      } else {
        throw err;
      }
    }
  }
}

function transpileCopilotYAML(agentsDir, outputDir) {
  const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
  if (dryRun) {
    logDry(
      `Would create ${agentFiles.length} Copilot YAML files in ${outputDir}`,
    );
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of agentFiles) {
    const content = fs.readFileSync(path.join(agentsDir, file), "utf8");
    const { data, body } = parseFrontmatter(content);
    if (!data.description && !body) {
      logWarn(`Skipping ${file}: no frontmatter found`);
      continue;
    }

    const name = path.basename(file, ".md");
    const desc = (data.description || "").replace(/"/g, '\\"');

    const yml = [
      `name: ${name}`,
      `description: "${desc}"`,
      `instructions: |`,
      ...body.split("\n").map((line) => `  ${line}`),
      "",
    ].join("\n");

    fs.writeFileSync(path.join(outputDir, `${name}.yml`), yml);
  }
}

function transpileCursorMDC(agentsDir, outputDir) {
  const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
  if (dryRun) {
    logDry(
      `Would create ${agentFiles.length} Cursor MDC files in ${outputDir}`,
    );
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of agentFiles) {
    const content = fs.readFileSync(path.join(agentsDir, file), "utf8");
    const { data, body } = parseFrontmatter(content);
    if (!data.description && !body) {
      logWarn(`Skipping ${file}: no frontmatter found`);
      continue;
    }

    const name = path.basename(file, ".md");
    const desc = (data.description || "").replace(/"/g, '\\"');

    const mdc = [
      "---",
      `description: "${desc}"`,
      'globs: "*"',
      "alwaysApply: false",
      "---",
      "",
      body,
    ].join("\n");

    fs.writeFileSync(path.join(outputDir, `${name}.mdc`), mdc);
  }
}

function scaffoldArtifacts(targetDir, projectName, userNickname = "User") {
  const artifactsDir = path.join(targetDir, "artifacts");
  if (fs.existsSync(artifactsDir)) {
    log("  Existing artifacts/ found, skipping.");
    return;
  }

  if (dryRun) {
    logDry(`Would create artifacts/ directory tree in ${targetDir}`);
    return;
  }

  const outputDirs = [
    "output/00-discovery",
    "output/01-research",
    "output/02-strategy",
    "output/03-architecture",
    "output/04-planning",
    "output/06-launch",
    "output/07-iteration",
    "output/08-incidents",
    "output/09-retro",
  ];
  const memoryDirs = [
    "memory/agent-notes",
    "memory/archive",
    "memory/session-summaries",
  ];
  const inputDirs = [
    "input/data",
    "input/designs",
    "input/documents",
    "input/example",
    "input/flows",
  ];
  const allDirs = [
    "directions",
    "telemetry",
    ...inputDirs,
    ...outputDirs,
    ...memoryDirs,
  ];

  for (const dir of allDirs) {
    fs.mkdirSync(path.join(artifactsDir, dir), { recursive: true });
  }

  const agentsDir = path.join(targetDir, ".agents", "agents");
  if (fs.existsSync(agentsDir)) {
    const agentFiles = fs
      .readdirSync(agentsDir)
      .filter((f) => f.endsWith(".md"));
    const pendingDir = path.join(artifactsDir, "memory", "pending-questions");
    fs.mkdirSync(pendingDir, { recursive: true });
    for (const agentFile of agentFiles) {
      const agentName = path.basename(agentFile, ".md");
      fs.mkdirSync(path.join(pendingDir, agentName), { recursive: true });
    }
  }

  const memoryPath = path.join(artifactsDir, "memory");
  const isoDate = new Date().toISOString().split("T")[0];

  fs.writeFileSync(
    path.join(memoryPath, "project-context.md"),
    `# Project Context

## Identity
- **Project Name**: ${projectName}
- **Repository**: None (not a git repository)
- **User Nickname**: ${userNickname}
- **Created**: ${isoDate}

## Technical
- **Stack**: None (Starting from scratch)
- **Architecture**: Not yet defined
- **Constraints**: None recorded

## Team
- **Squad**: full-team
- **Operation Mode**: semi-autonomous
- **Active Agents**: 21 (full-team preset)

## Memory
- **Lessons Learned**: None yet
- **Active Decisions**: None yet
`,
  );

  fs.writeFileSync(
    path.join(memoryPath, "active-decisions.md"),
    "# Active Decisions\n\nNo decisions recorded yet.\n",
  );
  fs.writeFileSync(
    path.join(memoryPath, "patterns-and-conventions.md"),
    "# Patterns & Conventions\n\nNo patterns recorded yet.\n",
  );
  fs.writeFileSync(
    path.join(memoryPath, "lessons-learned.md"),
    "# Lessons Learned\n\nNo lessons recorded yet.\n",
  );
  fs.writeFileSync(
    path.join(memoryPath, "blockers-and-risks.md"),
    "# Blockers & Risks\n\nNo blockers or risks recorded yet.\n",
  );
}

function bootstrapRootDocs(targetDir, projectName, selectedHarnesses) {
  const commandsDir = fs.existsSync(path.join(targetDir, ".agents", "commands"))
    ? path.join(targetDir, ".agents", "commands")
    : path.join(AGENTS_SRC, "commands");

  const agentsMd = fs
    .readFileSync(path.join(commandsDir, "scaffold-agents.md"), "utf8")
    .replace(/\{Project Name\}/g, projectName);
  const agentMd = fs.readFileSync(
    path.join(commandsDir, "scaffold-agent.md"),
    "utf8",
  );

  const agentsPath = path.join(targetDir, "AGENTS.md");
  const agentPath = path.join(targetDir, "agent.md");

  if (dryRun) {
    if (!fs.existsSync(agentsPath)) logDry(`Would create AGENTS.md`);
    if (!fs.existsSync(agentPath)) logDry(`Would create agent.md`);
    if (selectedHarnesses.includes("claude")) logDry(`Would create CLAUDE.md`);
    return;
  }

  if (!fs.existsSync(agentsPath)) fs.writeFileSync(agentsPath, agentsMd);
  if (!fs.existsSync(agentPath)) fs.writeFileSync(agentPath, agentMd);

  if (selectedHarnesses.includes("claude")) {
    const claudeMd = fs.readFileSync(
      path.join(commandsDir, "scaffold-claude.md"),
      "utf8",
    );
    const claudePath = path.join(targetDir, "CLAUDE.md");
    if (!fs.existsSync(claudePath)) fs.writeFileSync(claudePath, claudeMd);
  }
}

function writeVersionFile(targetDir) {
  const versionPath = path.join(targetDir, ".agents", ".vespyr-version");
  if (dryRun) {
    logDry(`Would write version file: ${versionPath}`);
    return;
  }
  const data = { version: VERSION, installed: new Date().toISOString() };
  fs.writeFileSync(versionPath, JSON.stringify(data, null, 2));
}

function getInstalledVersion(targetDir) {
  const versionPath = path.join(targetDir, ".agents", ".vespyr-version");
  if (!fs.existsSync(versionPath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(versionPath, "utf8"));
    return data.version || null;
  } catch (e) {
    return null;
  }
}

function updatePathsInDir(dir) {
  function walkSync(d) {
    const results = [];
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        results.push(...walkSync(full));
      } else {
        results.push(full);
      }
    }
    return results;
  }

  const files = walkSync(dir);
  for (const file of files) {
    if (!file.endsWith(".md") && !file.endsWith(".js")) continue;
    let content = fs.readFileSync(file, "utf8");
    const updated = content.replace(/\.opencode\//g, ".agents/");
    if (updated !== content) {
      if (dryRun) {
        logDry(`Would update paths in: ${file}`);
      } else {
        fs.writeFileSync(file, updated);
      }
    }
  }
}

function printSummary(targetDir, selections) {
  const lines = [
    `\n============================================================`,
    `   VESPYR v${VERSION} — Installation Complete`,
    `============================================================`,
    ``,
    `  Target:       ${targetDir}`,
    `  Squad:        full-team (21 agents)`,
    `  Harnesses:    ${selections.harnesses.join(", ") || "core only"}`,
    ``,
    `  Created:`,
    `    ✓ .agents/                        (core agent engine)`,
    `    ✓ AGENTS.md                       (harness-agnostic guide)`,
    `    ✓ agent.md                        (agent quick reference)`,
    `    ✓ artifacts/                      (memory + output directories)`,
  ];

  if (selections.harnesses.includes("opencode"))
    lines.push(`    ✓ .opencode -> .agents            (opencode harness)`);
  if (selections.harnesses.includes("claude")) {
    lines.push(`    ✓ .claude -> .agents              (Claude Code harness)`);
    lines.push(
      `    ✓ CLAUDE.md                       (Claude Code project memory)`,
    );
  }
  if (selections.harnesses.includes("cursor"))
    lines.push(`    ✓ .cursor/rules/*.mdc             (21 Cursor rules)`);
  if (selections.harnesses.includes("github"))
    lines.push(`    ✓ .github/agents/*.yml            (21 Copilot agents)`);
  if (selections.harnesses.includes("windsurf")) {
    lines.push(`    ✓ .windsurf/workflows -> skills   (Windsurf workflows)`);
    lines.push(`    ✓ .windsurfrules -> GUARDRAILS    (Windsurf rules)`);
  }
  if (selections.harnesses.includes("kiro"))
    lines.push(`    ✓ .kiro/steering -> agents        (Kiro steering)`);

  lines.push(
    ``,
    `  Next steps:`,
    `    1. Run /init to bootstrap your project context`,
    `    2. Type @founder, /validate-idea, or /validate-game-idea "your idea" to stress-test a concept`,
    `    3. Use @help-me for a tailored navigation report`,
    `    4. Use /squad to view or switch team presets`,
    ``,
    `  Docs: https://github.com/anomalyco/vespyr`,
    `  Report issues: https://github.com/anomalyco/vespyr/issues`,
    `============================================================`,
  );

  console.log(lines.join("\n"));
}

function setupSignalHandler(targetDir) {
  process.on("SIGINT", () => {
    if (!dryRun && fs.existsSync(path.join(targetDir, ".agents"))) {
      try {
        fs.rmSync(path.join(targetDir, ".agents"), {
          recursive: true,
          force: true,
        });
      } catch (e) {
        /* ignore */
      }
    }
    for (const link of createdLinks) {
      try {
        if (fs.existsSync(link)) fs.unlinkSync(link);
      } catch (e) {
        /* ignore */
      }
    }
    console.log("\nInstallation cancelled. No changes were made.");
    process.exit(130);
  });
}

const wizardState = {};

function clearScreen() {
  process.stdout.write("\x1b[2J\x1b[H");
}

function printWizardSummary() {
  const lines = [];
  if (wizardState.harnesses !== undefined) {
    lines.push(
      `  Harnesses: ${wizardState.harnesses.length ? wizardState.harnesses.join(", ") : "core only"}`,
    );
  }
  if (wizardState.scope !== undefined) {
    lines.push(`  Scope:     ${wizardState.scope}`);
  }
  if (wizardState.target !== undefined) {
    lines.push(`  Target:    ${wizardState.target}`);
  }
  if (wizardState.method !== undefined) {
    lines.push(`  Method:    ${wizardState.method}`);
  }
  if (wizardState.name !== undefined) {
    lines.push(`  Name:      ${wizardState.name}`);
  }
  if (lines.length > 0) {
    process.stdout.write(`\n  \x1b[2m── Current Selections ──\x1b[0m\n`);
    lines.forEach((l) => process.stdout.write(l + "\n"));
    process.stdout.write(`  \x1b[2m────────────────────────\x1b[0m\n`);
  }
}

function askChecklist(question, options, showBack = false) {
  return new Promise((resolve) => {
    const selected = new Array(options.length).fill(false);
    let cursor = 0;
    const totalOptions = options.length + (showBack ? 1 : 0);

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    function render() {
      clearScreen();
      log(ASCII_ART);
      printWizardSummary();
      process.stdout.write(`\n  ${question}\n`);
      process.stdout.write(
        `  \x1b[2m(Space to toggle, Enter to confirm)\x1b[0m\n\n`,
      );
      process.stdout.write(
        `    \x1b[32m✔\x1b[0m Core Agent Directory [Mandatory]\n\n`,
      );
      for (let i = 0; i < options.length; i++) {
        const pointer = i === cursor ? "\x1b[36m❯\x1b[0m" : " ";
        const check = selected[i] ? "\x1b[32m◉\x1b[0m" : "◯";
        process.stdout.write(`    ${pointer} ${check} ${options[i].label}\n`);
        process.stdout.write(`      \x1b[2m${options[i].description}\x1b[0m\n`);
      }
      if (showBack) {
        const pointer = cursor === options.length ? "\x1b[36m❯\x1b[0m" : " ";
        process.stdout.write(`\n    ${pointer} ← Back\n`);
      }
    }

    render();

    function onData(key) {
      if (key === "\u0003") {
        stdin.setRawMode(false);
        stdin.removeListener("data", onData);
        process.exit(130);
      }

      if (key === "\r" || key === "\n") {
        stdin.setRawMode(false);
        stdin.removeListener("data", onData);
        stdin.pause();
        if (showBack && cursor === options.length) {
          clearScreen();
          log(ASCII_ART);
          printWizardSummary();
          process.stdout.write("\n");
          resolve({ back: true });
          return;
        }
        const result = options.filter((_, i) => selected[i]).map((o) => o.id);
        wizardState.harnesses = result;
        clearScreen();
        log(ASCII_ART);
        printWizardSummary();
        process.stdout.write("\n");
        resolve(result);
        return;
      }

      if (key === " ") {
        if (cursor < options.length) {
          selected[cursor] = !selected[cursor];
        }
      }

      if (key === "\x1b[A") cursor = (cursor - 1 + totalOptions) % totalOptions;
      if (key === "\x1b[B") cursor = (cursor + 1) % totalOptions;

      render();
    }

    stdin.on("data", onData);
  });
}

function askSingleChoice(question, choices) {
  return new Promise((resolve) => {
    let cursor = 0;

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    function render() {
      clearScreen();
      log(ASCII_ART);
      printWizardSummary();
      process.stdout.write(`\n  ${question}\n`);
      process.stdout.write(
        `  \x1b[2m(Up/Down to navigate, Enter to confirm)\x1b[0m\n\n`,
      );
      for (let i = 0; i < choices.length; i++) {
        const pointer = i === cursor ? "\x1b[36m❯\x1b[0m" : " ";
        process.stdout.write(`    ${pointer} ${choices[i]}\n`);
      }
    }

    render();

    function onData(key) {
      if (key === "\u0003") {
        stdin.setRawMode(false);
        stdin.removeListener("data", onData);
        process.exit(130);
      }

      if (key === "\r" || key === "\n") {
        stdin.setRawMode(false);
        stdin.removeListener("data", onData);
        stdin.pause();
        clearScreen();
        log(ASCII_ART);
        printWizardSummary();
        process.stdout.write(
          `\n  \x1b[32m✓\x1b[0m ${question.replace(":", "")}: \x1b[1m${choices[cursor]}\x1b[0m\n`,
        );
        resolve(cursor);
        return;
      }

      if (key === "\x1b[A")
        cursor = (cursor - 1 + choices.length) % choices.length;
      if (key === "\x1b[B") cursor = (cursor + 1) % choices.length;

      render();
    }

    stdin.on("data", onData);
  });
}

function askQuestion(question, defaultVal = "") {
  return new Promise((resolve) => {
    clearScreen();
    log(ASCII_ART);
    printWizardSummary();

    const display = defaultVal ? `${question} [${defaultVal}]` : question;
    process.stdout.write(`\n  ${display}: `);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    rl.on("line", (line) => {
      rl.close();
      const result = line.trim() || defaultVal;
      resolve(result);
    });
  });
}

async function installHarnesses(targetDir, selections, method) {
  const agentsTarget = path.join(targetDir, ".agents");

  if (selections.includes("opencode")) {
    const linkPath = path.join(targetDir, ".opencode");
    handleConflict(linkPath, ".opencode", targetDir);
    if (!fs.existsSync(linkPath)) {
      createLinkOrCopy(
        path.relative(targetDir, agentsTarget),
        linkPath,
        "dir",
        method,
      );
    }
  }

  if (selections.includes("claude")) {
    const linkPath = path.join(targetDir, ".claude");
    handleConflict(linkPath, ".claude", targetDir);
    if (!fs.existsSync(linkPath)) {
      createLinkOrCopy(
        path.relative(targetDir, agentsTarget),
        linkPath,
        "dir",
        method,
      );
    }
  }

  if (selections.includes("cursor")) {
    const rulesDir = path.join(targetDir, ".cursor", "rules");
    if (!dryRun && !fs.existsSync(rulesDir)) {
      fs.mkdirSync(rulesDir, { recursive: true });
    }
    transpileCursorMDC(path.join(agentsTarget, "agents"), rulesDir);
  }

  if (selections.includes("github")) {
    const agentsOutDir = path.join(targetDir, ".github", "agents");
    if (!dryRun && !fs.existsSync(agentsOutDir)) {
      fs.mkdirSync(agentsOutDir, { recursive: true });
    }
    transpileCopilotYAML(path.join(agentsTarget, "agents"), agentsOutDir);

    const copilotInstructions = path.join(
      targetDir,
      ".github",
      "copilot-instructions.md",
    );
    const agentsMdPath = path.join(targetDir, "AGENTS.md");
    if (!fs.existsSync(copilotInstructions)) {
      createLinkOrCopy(
        path.relative(path.join(targetDir, ".github"), agentsMdPath),
        copilotInstructions,
        "file",
        method,
      );
    }
  }

  if (selections.includes("windsurf")) {
    const workflowsDir = path.join(targetDir, ".windsurf", "workflows");
    if (!dryRun) {
      fs.mkdirSync(path.join(targetDir, ".windsurf"), { recursive: true });
    }
    if (!fs.existsSync(workflowsDir)) {
      createLinkOrCopy(
        path.relative(
          path.join(targetDir, ".windsurf"),
          path.join(agentsTarget, "skills"),
        ),
        workflowsDir,
        "dir",
        method,
      );
    }

    const windsurfRules = path.join(targetDir, ".windsurfrules");
    handleConflict(windsurfRules, ".windsurfrules", targetDir);
    if (!fs.existsSync(windsurfRules)) {
      createLinkOrCopy(
        path.relative(targetDir, path.join(agentsTarget, "GUARDRAILS.md")),
        windsurfRules,
        "file",
        method,
      );
    }
  }

  if (selections.includes("kiro")) {
    const steeringDir = path.join(targetDir, ".kiro", "steering");
    if (!dryRun) {
      fs.mkdirSync(path.join(targetDir, ".kiro"), { recursive: true });
    }
    if (!fs.existsSync(steeringDir)) {
      createLinkOrCopy(
        path.relative(
          path.join(targetDir, ".kiro"),
          path.join(agentsTarget, "agents"),
        ),
        steeringDir,
        "dir",
        method,
      );
    }
  }
}

function handleConflict(linkPath, name, targetDir) {
  if (!fs.existsSync(linkPath)) return;

  try {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(linkPath);
      if (
        target === ".agents" ||
        target.endsWith("/.agents") ||
        target.includes(".agents/")
      ) {
        return;
      }
      logWarn(`Symlink ${name} points to ${target}. Will overwrite.`);
      if (!dryRun) fs.unlinkSync(linkPath);
    } else {
      const backupPath = `${linkPath}.backup.${Date.now()}`;
      logWarn(
        `Existing ${name} found. Backing up to ${path.basename(backupPath)}`,
      );
      if (!dryRun) {
        fs.renameSync(linkPath, backupPath);
      }
    }
  } catch (e) {
    // ignore
  }
}

function getGlobalPath(harness) {
  const home = os.homedir();
  const platform = process.platform;

  const paths = {
    opencode: path.join(home, ".opencode"),
    claude: path.join(home, ".claude"),
    agents: path.join(home, ".agents"),
    kiro: path.join(home, ".kiro"),
    windsurf: path.join(home, ".windsurf"),
    github:
      platform === "win32"
        ? path.join(home, ".config", "github-copilot")
        : path.join(home, ".config", "github-copilot"),
    cursor:
      platform === "darwin"
        ? path.join(
            home,
            "Library",
            "Application Support",
            "Cursor",
            "User",
            "globalRules",
          )
        : platform === "linux"
          ? path.join(home, ".config", "Cursor", "User", "globalRules")
          : path.join(home, ".config", "Cursor", "User", "globalRules"),
  };

  return paths[harness] || null;
}

async function performGlobalInstall(selections, method, userNickname) {
  const globalAgentsDir = getGlobalPath("agents");
  const home = os.homedir();

  log(`\n  Installing Vespyr v${VERSION} globally...\n`);

  if (dryRun) {
    logDry(`Would copy .agents/ to ${globalAgentsDir}`);
    for (const h of selections) {
      const gp = getGlobalPath(h);
      if (gp) logDry(`Would create ${h} link at ${gp}`);
    }
    return;
  }

  // Copy .agents/ to ~/.agents/
  if (!fs.existsSync(globalAgentsDir)) {
    const tempDir = path.join(home, `.agents.tmp.${Date.now()}`);
    fs.cpSync(AGENTS_SRC, tempDir, { recursive: true });
    fs.renameSync(tempDir, globalAgentsDir);
  }

  // Write version file
  const versionPath = path.join(globalAgentsDir, ".vespyr-version");
  const data = { version: VERSION, installed: new Date().toISOString(), global: true };
  fs.writeFileSync(versionPath, JSON.stringify(data, null, 2));

  // Create harness links at global paths
  const harnessLinkMap = {
    opencode: { type: "dir", source: path.join(globalAgentsDir) },
    claude: { type: "dir", source: path.join(globalAgentsDir) },
    cursor: { type: "dir", source: path.join(globalAgentsDir, "agents"), output: "rules" },
    github: { type: "dir", source: path.join(globalAgentsDir, "agents"), output: "agents" },
    windsurf: { type: "dir", source: path.join(globalAgentsDir, "skills"), output: "workflows" },
    kiro: { type: "dir", source: path.join(globalAgentsDir, "agents"), output: "steering" },
  };

  for (const h of selections) {
    const config = harnessLinkMap[h];
    if (!config) continue;

    const globalTarget = getGlobalPath(h);
    if (!globalTarget) continue;

    if (h === "cursor" || h === "github" || h === "windsurf" || h === "kiro") {
      // These need subdirectory handling
      const parentDir = path.dirname(globalTarget);
      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
      if (!fs.existsSync(globalTarget)) fs.mkdirSync(globalTarget, { recursive: true });

      if (h === "cursor") {
        const rulesDir = path.join(globalTarget, "rules");
        if (!fs.existsSync(rulesDir)) fs.mkdirSync(rulesDir, { recursive: true });
        transpileCursorMDC(config.source, rulesDir);
      } else if (h === "github") {
        const agentsDir = path.join(globalTarget, "agents");
        if (!fs.existsSync(agentsDir)) fs.mkdirSync(agentsDir, { recursive: true });
        transpileCopilotYAML(config.source, agentsDir);
      } else if (h === "windsurf") {
        const workflowsDir = path.join(globalTarget, "workflows");
        if (!fs.existsSync(workflowsDir)) {
          createLinkOrCopy(config.source, workflowsDir, "dir", method);
        }
        // Also create .windsurfrules
        const windsurfRules = path.join(home, ".windsurfrules");
        if (!fs.existsSync(windsurfRules)) {
          createLinkOrCopy(
            path.join(globalAgentsDir, "GUARDRAILS.md"),
            windsurfRules,
            "file",
            method,
          );
        }
      } else if (h === "kiro") {
        const steeringDir = path.join(globalTarget, "steering");
        if (!fs.existsSync(steeringDir)) {
          createLinkOrCopy(config.source, steeringDir, "dir", method);
        }
      }
    } else {
      // Simple dir symlinks (opencode, claude)
      if (!fs.existsSync(globalTarget)) {
        createLinkOrCopy(config.source, globalTarget, "dir", method);
      }
    }
  }

  log(`  Global install complete.`);
  log(`  .agents/ installed to: ${globalAgentsDir}`);
  log(`  Harnesses configured: ${selections.join(", ") || "none"}\n`);
}

async function performFreshInstall(targetDir, flags) {
  log(`\n  Installing Vespyr v${VERSION} to ${targetDir}...\n`);

  setupSignalHandler(targetDir);

  let selections = flags.harnesses.length > 0 ? flags.harnesses : [];
  let method = "symlink";
  let userNickname = "User";

  if (!flags.yes) {
    let currentStep = 0;
    const steps = ["harnesses", "scope", "path", "method", "name", "confirm"];

    while (currentStep < steps.length) {
      const step = steps[currentStep];

      if (step === "harnesses") {
        const harnessResult = await askChecklist(
          "Select harness integrations to configure:",
          HARNESS_OPTIONS,
          currentStep > 0,
        );
        if (harnessResult.back) {
          // Can't go back from first step, so just stay here
          continue;
        }
        selections = harnessResult;
        currentStep++;
      } else if (step === "scope") {
        const scopeChoice = await askSingleChoice(
          "Select installation scope:",
          [
            "Project-level (Install in current workspace)",
            "Global (Install in user home/global environment paths)",
            "← Back",
          ],
        );
        if (scopeChoice === 2) {
          currentStep--;
        } else {
          wizardState.scope = scopeChoice === 0 ? "Project-level" : "Global";
          currentStep++;
        }
      } else if (step === "path") {
        if (wizardState.scope === "Global") {
          currentStep++;
          continue;
        }
        const pathChoice = await askSingleChoice("Select target directory:", [
          "Current directory (.)",
          "Custom path (Enter a custom folder path)",
          "← Back",
        ]);
        if (pathChoice === 2) {
          currentStep--;
        } else if (pathChoice === 1) {
          const customPath = await askQuestion("Enter custom path", ".");
          targetDir = path.resolve(customPath);
          wizardState.target = targetDir;
          currentStep++;
        } else {
          wizardState.target = targetDir;
          currentStep++;
        }
      } else if (step === "method") {
        const methodChoice = await askSingleChoice(
          "Select installation method:",
          [
            "Symlink (Recommended - references the master folder, allowing prompt updates to automatically propagate)",
            "Copy (Static copy of all agent folders and files)",
            "← Back",
          ],
        );
        if (methodChoice === 2) {
          currentStep--;
        } else {
          method = methodChoice === 0 ? "symlink" : "copy";
          wizardState.method = method;
          currentStep++;
        }
      } else if (step === "name") {
        userNickname = await askQuestion(
          "What should the agent squad call you? (e.g., Christian, Sarah)",
          userNickname || "User",
        );
        userNickname =
          userNickname.replace(/[^a-zA-Z0-9\s\-_.]/g, "") || "User";
        wizardState.name = userNickname;
        currentStep++;
      } else if (step === "confirm") {
        clearScreen();
        log(ASCII_ART);
        log(`\n  \x1b[2m── Configuration ──\x1b[0m`);
        log(
          `  Harnesses: ${selections.length ? selections.join(", ") : "core only"}`,
        );
        log(`  Scope:     ${wizardState.scope}`);
        log(`  Target:    ${targetDir}`);
        log(`  Method:    ${method}`);
        log(`  Name:      ${userNickname}`);
        log(`  \x1b[2m────────────────────\x1b[0m\n`);

        const confirmChoice = await askSingleChoice(
          "Proceed with installation?",
          ["Yes, install now", "← Back to edit", "Cancel installation"],
        );
        if (confirmChoice === 0) {
          break;
        } else if (confirmChoice === 1) {
          currentStep = 0;
        } else {
          log("\n  Installation cancelled.\n");
          process.exit(0);
        }
      }
    }
  }

  // Handle global vs project-level install
  if (wizardState.scope === "Global") {
    await performGlobalInstall(selections, method, userNickname);
    return;
  }

  if (!fs.existsSync(targetDir)) {
    if (dryRun) {
      logDry(`Would create directory: ${targetDir}`);
    } else {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  const agentsTarget = path.join(targetDir, ".agents");

  if (dryRun) {
    logDry(`Would copy .agents/ to ${agentsTarget}`);
  } else {
    const tempDir = path.join(targetDir, `.agents.tmp.${Date.now()}`);
    fs.cpSync(AGENTS_SRC, tempDir, { recursive: true });
    fs.renameSync(tempDir, agentsTarget);
    installed = true;
  }

  writeVersionFile(targetDir);

  const projectName = path.basename(targetDir);
  scaffoldArtifacts(targetDir, projectName, userNickname);
  bootstrapRootDocs(targetDir, projectName, selections);
  await installHarnesses(targetDir, selections, method);

  if (!dryRun) {
    printSummary(targetDir, { harnesses: selections });
  }
}

async function performUpdate(targetDir, flags) {
  log(`\n  Updating Vespyr in ${targetDir}...\n`);

  const agentsTarget = path.join(targetDir, ".agents");
  const prevVersion = getInstalledVersion(targetDir);

  if (dryRun) {
    logDry(`Would overwrite .agents/ with v${VERSION}`);
    logDry(`Would preserve artifacts/ directory`);
    logDry(`Would recompile all harness files`);
    return;
  }

  const tempDir = path.join(targetDir, `.agents.tmp.${Date.now()}`);
  fs.cpSync(AGENTS_SRC, tempDir, { recursive: true });

  if (fs.existsSync(agentsTarget)) {
    fs.rmSync(agentsTarget, { recursive: true, force: true });
  }
  fs.renameSync(tempDir, agentsTarget);

  writeVersionFile(targetDir);

  const versionFile = path.join(targetDir, ".agents", ".vespyr-version");
  let installedHarnesses = [];
  if (fs.existsSync(path.join(targetDir, ".opencode")))
    installedHarnesses.push("opencode");
  if (fs.existsSync(path.join(targetDir, ".claude")))
    installedHarnesses.push("claude");
  if (fs.existsSync(path.join(targetDir, ".cursor", "rules")))
    installedHarnesses.push("cursor");
  if (fs.existsSync(path.join(targetDir, ".github", "agents")))
    installedHarnesses.push("github");
  if (fs.existsSync(path.join(targetDir, ".windsurf", "workflows")))
    installedHarnesses.push("windsurf");
  if (fs.existsSync(path.join(targetDir, ".kiro", "steering")))
    installedHarnesses.push("kiro");

  await installHarnesses(targetDir, installedHarnesses, "symlink");

  log(`  Updated from v${prevVersion || "unknown"} to v${VERSION}`);
  log(`  Harnesses recompiled: ${installedHarnesses.join(", ") || "none"}`);
  log(`  artifacts/ preserved.\n`);
}

async function performReconfigure(targetDir, flags) {
  log(`\n  Reconfiguring Vespyr in ${targetDir}...\n`);

  let selections = flags.harnesses.length > 0 ? flags.harnesses : [];
  if (!flags.yes) {
    selections = await askChecklist(
      "Select harness integrations to configure:",
      HARNESS_OPTIONS,
    );
  }

  await installHarnesses(targetDir, selections, "symlink");

  log(
    `  Reconfiguration complete. Harnesses: ${selections.join(", ") || "core only"}\n`,
  );
}

async function performUninstall(targetDir) {
  log(`\n  Uninstalling Vespyr from ${targetDir}...\n`);

  if (dryRun) {
    logDry(`Would delete .agents/`);
    logDry(`Would delete all harness symlinks`);
    logDry(`Would delete AGENTS.md, agent.md, CLAUDE.md`);
    logDry(`Would preserve artifacts/`);
    return;
  }

  const agentsTarget = path.join(targetDir, ".agents");
  if (fs.existsSync(agentsTarget)) {
    fs.rmSync(agentsTarget, { recursive: true, force: true });
  }

  const symlinksToRemove = [".opencode", ".claude", ".windsurfrules"];
  for (const link of symlinksToRemove) {
    const linkPath = path.join(targetDir, link);
    if (fs.existsSync(linkPath)) {
      try {
        const stat = fs.lstatSync(linkPath);
        if (stat.isSymbolicLink()) {
          fs.unlinkSync(linkPath);
        }
      } catch (e) {
        /* ignore */
      }
    }
  }

  const dirsToRemove = [
    ".cursor/rules",
    ".github/agents",
    ".windsurf/workflows",
    ".kiro/steering",
  ];
  for (const dir of dirsToRemove) {
    const dirPath = path.join(targetDir, dir);
    if (fs.existsSync(dirPath)) {
      try {
        const stat = fs.lstatSync(dirPath);
        if (stat.isSymbolicLink()) {
          fs.unlinkSync(dirPath);
        } else {
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
      } catch (e) {
        /* ignore */
      }
    }
  }

  const copilotInstructions = path.join(
    targetDir,
    ".github",
    "copilot-instructions.md",
  );
  if (fs.existsSync(copilotInstructions)) {
    try {
      const stat = fs.lstatSync(copilotInstructions);
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(copilotInstructions);
      }
    } catch (e) {
      /* ignore */
    }
  }

  const filesToRemove = ["AGENTS.md", "agent.md", "CLAUDE.md"];
  for (const file of filesToRemove) {
    const filePath = path.join(targetDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  log(`  Uninstall complete. artifacts/ preserved.\n`);
}

async function performMigration(targetDir, flags) {
  log(`\n============================================================`);
  log(`   VESPYR v${VERSION} — Migration Detected`);
  log(`============================================================`);
  log(`An existing .opencode/ directory was found. This appears to be`);
  log(`a pre-v1.7.0 Vespyr installation (cloned repo style).`);
  log(``);
  log(`Vespyr v1.7.0 uses .agents/ as the canonical folder with`);
  log(`optional harness symlinks. We can migrate your setup.\n`);

  if (flags.yes) {
    await executeMigration(targetDir);
    return;
  }

  const choice = await askSingleChoice("Select an action:", [
    "Migrate (Rename .opencode/ to .agents/, create .opencode symlink)",
    "Fresh install (Back up .opencode/ to .opencode.backup/, start fresh)",
    "Cancel (Keep everything as-is)",
  ]);

  if (choice === 0) {
    await executeMigration(targetDir);
  } else if (choice === 1) {
    const backupPath = path.join(targetDir, `.opencode.backup.${Date.now()}`);
    if (!dryRun) {
      fs.renameSync(path.join(targetDir, ".opencode"), backupPath);
    }
    log(`  Backed up .opencode/ to ${path.basename(backupPath)}`);
    await performFreshInstall(targetDir, flags);
  } else {
    log(`  Migration cancelled.\n`);
    process.exit(0);
  }
}

async function executeMigration(targetDir) {
  log(`\n  Migrating .opencode/ to .agents/...\n`);

  if (dryRun) {
    logDry(`Would backup .opencode/ to .opencode.backup/`);
    logDry(`Would rename .opencode/ to .agents/`);
    logDry(`Would move tests/ to workspace root`);
    logDry(`Would create .opencode -> .agents symlink`);
    logDry(`Would update .opencode/ references to .agents/ in all files`);
    return;
  }

  const opencodePath = path.join(targetDir, ".opencode");
  const agentsPath = path.join(targetDir, ".agents");
  const backupPath = path.join(targetDir, `.opencode.backup.${Date.now()}`);

  fs.cpSync(opencodePath, backupPath, { recursive: true });
  log(`  Backed up to ${path.basename(backupPath)}`);

  fs.renameSync(opencodePath, agentsPath);
  log(`  Renamed .opencode/ to .agents/`);

  const testsInAgents = path.join(agentsPath, "tests");
  const testsAtRoot = path.join(targetDir, "tests");
  if (fs.existsSync(testsInAgents) && !fs.existsSync(testsAtRoot)) {
    fs.renameSync(testsInAgents, testsAtRoot);
    log(`  Moved tests/ to workspace root`);
  }

  try {
    fs.symlinkSync(".agents", opencodePath, "dir");
    createdLinks.push(opencodePath);
    log(`  Created .opencode -> .agents symlink`);
  } catch (e) {
    logWarn(`Could not create .opencode symlink: ${e.message}`);
  }

  updatePathsInDir(agentsPath);
  log(`  Updated .opencode/ -> .agents/ references in all files`);

  writeVersionFile(targetDir);
  log(`\n  Migration complete.\n`);
}

async function showActionMenu(targetDir, flags) {
  log(`\n============================================================`);
  log(`   VESPYR v${VERSION} — AI Agent Team CLI`);
  log(`============================================================`);
  log(`Vespyr is already configured in this directory.\n`);

  if (flags.yes) {
    await performUpdate(targetDir, flags);
    return;
  }

  const choice = await askSingleChoice("Select an action:", [
    "Update Vespyr (Sync latest agent prompts, scripts, and skills)",
    "Reconfigure (Re-run interactive setup / add or remove harnesses)",
    "Uninstall Vespyr (Cleanly remove all Vespyr folders and files)",
  ]);

  if (choice === 0) {
    await performUpdate(targetDir, flags);
  } else if (choice === 1) {
    await performReconfigure(targetDir, flags);
  } else if (choice === 2) {
    await performUninstall(targetDir);
  }
}

async function main() {
  const flags = parseFlags(process.argv);
  dryRun = flags.dryRun;

  if (flags.version) {
    console.log(VERSION);
    process.exit(0);
  }

  if (flags.help) {
    console.log(`
vespyr v${VERSION} — AI Agent Team Installer

Usage: npx vespyr [options]

Options:
  --dry-run            Preview all actions without making changes
  --yes, -y            Skip all interactive prompts, use defaults
  --target <path>      Specify installation directory
  --harness <names>    Pre-select harness(es), comma-separated
  --version, -v        Print version and exit
  --help, -h           Print usage and exit

Examples:
  npx vespyr                          Interactive install
  npx vespyr --yes                    Install with defaults
  npx vespyr --harness opencode,claude  Pre-select harnesses
  npx vespyr --target ./my-project    Install to specific directory
  npx vespyr --dry-run                Preview actions
`);
    process.exit(0);
  }

  log(ASCII_ART);

  let targetDir = flags.target ? path.resolve(flags.target) : process.cwd();

  if (flags.target && !fs.existsSync(targetDir)) {
    logError(`The specified path does not exist: ${targetDir}`);
    process.exit(1);
  }

  const state = detectState(targetDir);

  try {
    if (state === "installed") {
      await showActionMenu(targetDir, flags);
    } else if (state === "migrate") {
      await performMigration(targetDir, flags);
    } else {
      log(`\n============================================================`);
      log(`   VESPYR v${VERSION} — AI Agent Team Installer`);
      log(`============================================================\n`);
      await performFreshInstall(targetDir, flags);
    }
  } catch (err) {
    if (err.code === "EACCES" || err.code === "EPERM") {
      logError(
        `Permission denied. Try running with appropriate privileges or check directory ownership.`,
      );
    } else if (err.code === "ENOSPC") {
      logError(`Not enough disk space to complete installation.`);
    } else if (err.code === "ENOENT") {
      logError(
        `The specified path does not exist. Create it first or choose a different directory.`,
      );
    } else {
      logError(
        `Installation failed: ${err.message}. Run with --dry-run to debug, or report at github.com/anomalyco/vespyr/issues.`,
      );
    }

    if (!dryRun && installed) {
      const agentsTarget = path.join(targetDir, ".agents");
      if (fs.existsSync(agentsTarget)) {
        fs.rmSync(agentsTarget, { recursive: true, force: true });
      }
      for (const link of createdLinks) {
        if (fs.existsSync(link)) {
          try {
            fs.unlinkSync(link);
          } catch (e) {
            /* ignore */
          }
        }
      }
    }

    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  parseFlags,
  parseFrontmatter,
  detectState,
  createLinkOrCopy,
  transpileCopilotYAML,
  transpileCursorMDC,
  scaffoldArtifacts,
  bootstrapRootDocs,
  writeVersionFile,
  getInstalledVersion,
  updatePathsInDir,
  printSummary,
  ASCII_ART,
  VERSION,
  HARNESS_OPTIONS,
};
