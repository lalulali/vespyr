/**
 * Pluggable Execution Adapters for vespyr-eval (02j)
 * Connects the evaluation runner to real LLMs (Gemini, Anthropic, OpenAI, Ollama),
 * CLI harnesses (Claude Code, Antigravity CLI, custom commands), or deterministic fallback.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..", "..", "..");

/** Max persona characters shipped as a system prompt (full .md files are unbounded). */
const MAX_SYSTEM_PROMPT_CHARS = 8000;

/** Lines matching these are redacted before a persona ships as a prompt. */
const SECRET_LINE = /(api[_-]?key|secret|token|password|credential|private[_-]?key)\s*[:=]/i;

/**
 * Loads agent persona instructions if specified on the benchmark.
 * Traversal-guarded: only bare `[a-z0-9-]` names resolve inside
 * `.agents/agents/`; anything else (e.g. `../../etc/passwd`) returns null
 * instead of having its content POSTed to a provider as a system prompt.
 */
function loadAgentSystemPrompt(agentName) {
  if (!agentName || agentName === "all") return null;
  const cleanName = String(agentName).replace(/^@/, "");
  if (!/^[a-z0-9-]+$/i.test(cleanName)) return null;
  const agentFile = path.join(ROOT_DIR, ".agents", "agents", cleanName + ".md");
  const resolved = path.resolve(agentFile);
  if (!resolved.startsWith(path.join(ROOT_DIR, ".agents", "agents") + path.sep)) return null;
  if (fs.existsSync(resolved)) {
    const raw = fs.readFileSync(resolved, "utf8");
    const redacted = raw.split("\n").map(line => SECRET_LINE.test(line) ? "[REDACTED]" : line).join("\n");
    return redacted.length > MAX_SYSTEM_PROMPT_CHARS
      ? redacted.slice(0, MAX_SYSTEM_PROMPT_CHARS) + "\n…[truncated]"
      : redacted;
  }
  return null;
}

/**
 * CLI Adapter: spawns an external process with the benchmark prompt.
 * Hardened: no shell (the command string is split, never interpreted),
 * allowlisted env (no full host env, no VESPYR_PROMPT duplication — the
 * prompt travels on stdin only, never in the process table), bounded output.
 */
async function cliAdapter(benchmark, { options = {}, sandbox = null }) {
  const cliCommand = options.cli || process.env.VESPYR_EVAL_CLI;
  if (!cliCommand) {
    throw new Error("CLI adapter requires --cli <command> or VESPYR_EVAL_CLI environment variable");
  }

  const cwd = sandbox ? sandbox.dir : process.cwd();
  const { splitCommand } = require("../lib/process");
  const parts = splitCommand(String(cliCommand));
  const file = parts[0];
  const baseArgs = parts.slice(1);

  // Explicit env: tooling essentials + provider credentials the child may
  // need + run metadata. Everything else (notably the full prompt, which
  // used to ride along as VESPYR_PROMPT) is excluded.
  const env = {};
  for (const k of ["PATH", "PATHEXT", "HOME", "USER", "LOGNAME", "SHELL", "TMPDIR", "TEMP", "TMP",
                   "LANG", "LC_ALL", "LC_CTYPE", "TZ", "SYSTEMROOT", "SYSTEMDRIVE", "COMSPEC",
                   "NODE_ENV", "CI", "TERM",
                   "OPENAI_API_KEY", "OPENAI_BASE_URL", "ANTHROPIC_API_KEY",
                   "GEMINI_API_KEY", "OLLAMA_HOST"]) {
    if (process.env[k] !== undefined) env[k] = process.env[k];
  }
  env.VESPYR_BENCHMARK_ID = benchmark.id;
  env.VESPYR_BENCHMARK_AGENT = benchmark.agent || "";
  env.VESPYR_BENCHMARK_SKILL = benchmark.skill || "";

  const res = spawnSync(file, baseArgs, {
    cwd,
    encoding: "utf8",
    timeout: options.timeout || 60000,
    maxBuffer: 1024 * 1024,
    shell: false,
    input: benchmark.prompt,
    env
  });

  return {
    output: res.stdout || res.stderr || "",
    tokens: null,
    exitCode: res.status
  };
}

/**
 * OpenAI / OpenAI-compatible API Adapter
 */
async function openaiAdapter(benchmark, { options = {}, sandbox = null }) {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  const baseUrl = options.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = (options.model && options.model !== "inherit") ? options.model : "gpt-4o";

  if (!apiKey && !process.env.OPENAI_BASE_URL) {
    throw new Error("OpenAI adapter requires OPENAI_API_KEY or OPENAI_BASE_URL");
  }

  const systemPrompt = loadAgentSystemPrompt(benchmark.agent) || "You are an AI assistant in the Vespyr multi-agent engine.";
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: benchmark.prompt }
  ];

  const headers = {
    "Content-Type": "application/json"
  };
  if (apiKey) {
    headers["Authorization"] = "Bearer " + apiKey;
  }

  const body = {
    model,
    messages,
    temperature: options.temp !== undefined ? options.temp : 0.0
  };

  const response = await fetch(baseUrl.replace(/\/+$/, "") + "/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("OpenAI API request failed (" + response.status + "): " + errorText);
  }

  const data = await response.json();
  const choice = data.choices && data.choices[0];
  const output = (choice && choice.message && choice.message.content) || "";
  const tokens = data.usage ? data.usage.total_tokens : null;

  return { output, tokens };
}

/**
 * Anthropic API Adapter
 */
async function anthropicAdapter(benchmark, { options = {}, sandbox = null }) {
  const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
  const model = (options.model && options.model !== "inherit") ? options.model : "claude-3-5-sonnet-20241022";

  if (!apiKey) {
    throw new Error("Anthropic adapter requires ANTHROPIC_API_KEY");
  }

  const systemPrompt = loadAgentSystemPrompt(benchmark.agent) || "You are an AI assistant in the Vespyr multi-agent engine.";
  const body = {
    model,
    max_tokens: 4096,
    temperature: options.temp !== undefined ? options.temp : 0.0,
    system: systemPrompt,
    messages: [
      { role: "user", content: benchmark.prompt }
    ]
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Anthropic API request failed (" + response.status + "): " + errorText);
  }

  const data = await response.json();
  const output = (data.content && data.content[0] && data.content[0].text) || "";
  const tokens = data.usage ? (data.usage.input_tokens + data.usage.output_tokens) : null;

  return { output, tokens };
}

/**
 * Google Gemini API Adapter
 */
async function geminiAdapter(benchmark, { options = {}, sandbox = null }) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const model = (options.model && options.model !== "inherit") ? options.model : "gemini-1.5-flash";

  if (!apiKey) {
    throw new Error("Gemini adapter requires GEMINI_API_KEY");
  }

  const systemPrompt = loadAgentSystemPrompt(benchmark.agent);
  const contents = [
    { role: "user", parts: [{ text: benchmark.prompt }] }
  ];

  const body = {
    contents,
    generationConfig: {
      temperature: options.temp !== undefined ? options.temp : 0.0
    }
  };

  if (systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Gemini API request failed (" + response.status + "): " + errorText);
  }

  const data = await response.json();
  const candidate = data.candidates && data.candidates[0];
  const output = (candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text) || "";
  const tokens = data.usageMetadata ? data.usageMetadata.totalTokenCount : null;

  return { output, tokens };
}

/**
 * Ollama Local HTTP Adapter
 */
async function ollamaAdapter(benchmark, { options = {}, sandbox = null }) {
  const host = options.baseUrl || process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
  const model = (options.model && options.model !== "inherit") ? options.model : "llama3";
  const systemPrompt = loadAgentSystemPrompt(benchmark.agent) || "";

  const body = {
    model,
    prompt: benchmark.prompt,
    system: systemPrompt,
    stream: false,
    options: {
      temperature: options.temp !== undefined ? options.temp : 0.0
    }
  };

  const response = await fetch(host.replace(/\/+$/, "") + "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Ollama API request failed (" + response.status + "): " + errorText);
  }

  const data = await response.json();
  const output = data.response || "";
  const tokens = (data.prompt_eval_count || 0) + (data.eval_count || 0);

  return { output, tokens: tokens || null };
}

/**
 * Resolves the appropriate execution adapter based on options and environment.
 * Fail-closed on unknown names: a typo'd `--adapter gpt5` throws here
 * instead of resolving null and silently green-lighting a mock run.
 */
function resolveAdapter(options = {}) {
  const adapterName = (options.adapter || process.env.VESPYR_EVAL_ADAPTER || "").toLowerCase();

  if (adapterName === "cli" || options.cli || process.env.VESPYR_EVAL_CLI) {
    return cliAdapter;
  }
  if (adapterName === "openai") {
    return openaiAdapter;
  }
  if (adapterName === "anthropic") {
    return anthropicAdapter;
  }
  if (adapterName === "gemini") {
    return geminiAdapter;
  }
  if (adapterName === "ollama") {
    return ollamaAdapter;
  }
  if (adapterName === "mock") {
    return null;
  }

  if (adapterName === "auto") {
    if (process.env.GEMINI_API_KEY) return geminiAdapter;
    if (process.env.ANTHROPIC_API_KEY) return anthropicAdapter;
    if (process.env.OPENAI_API_KEY) return openaiAdapter;
    if (process.env.OLLAMA_HOST) return ollamaAdapter;
    return null; // no credentials: caller fails closed unless --mock is explicit
  }

  if (adapterName === "") {
    return null; // unspecified: fail closed unless --mock is explicit
  }

  throw new Error(
    `Unknown eval adapter "${adapterName}" (expected auto, mock, cli, openai, anthropic, gemini, ollama). ` +
    `Refusing to fall back to mock — fix the name or pass --mock explicitly.`
  );
}

module.exports = {
  cliAdapter,
  openaiAdapter,
  anthropicAdapter,
  geminiAdapter,
  ollamaAdapter,
  resolveAdapter,
  loadAgentSystemPrompt
};
