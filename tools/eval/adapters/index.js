/**
 * Pluggable Execution Adapters for vespyr-eval (02j)
 * Connects the evaluation runner to real LLMs (Gemini, Anthropic, OpenAI, Ollama),
 * CLI harnesses (Claude Code, Antigravity CLI, custom commands), or deterministic fallback.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..", "..", "..");

/**
 * Loads agent persona instructions if specified on the benchmark.
 */
function loadAgentSystemPrompt(agentName) {
  if (!agentName || agentName === "all") return null;
  const cleanName = agentName.replace(/^@/, "");
  const agentFile = path.join(ROOT_DIR, ".agents", "agents", cleanName + ".md");
  if (fs.existsSync(agentFile)) {
    return fs.readFileSync(agentFile, "utf8");
  }
  return null;
}

/**
 * CLI Adapter: spawns an external process with the benchmark prompt
 */
async function cliAdapter(benchmark, { options = {}, sandbox = null }) {
  const cliCommand = options.cli || process.env.VESPYR_EVAL_CLI;
  if (!cliCommand) {
    throw new Error("CLI adapter requires --cli <command> or VESPYR_EVAL_CLI environment variable");
  }

  const cwd = sandbox ? sandbox.dir : process.cwd();

  const res = spawnSync(cliCommand, {
    cwd,
    encoding: "utf8",
    timeout: options.timeout || 60000,
    shell: true,
    input: benchmark.prompt,
    env: {
      ...process.env,
      VESPYR_BENCHMARK_ID: benchmark.id,
      VESPYR_BENCHMARK_AGENT: benchmark.agent || "",
      VESPYR_BENCHMARK_SKILL: benchmark.skill || "",
      VESPYR_PROMPT: benchmark.prompt
    }
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
 * Resolves the appropriate execution adapter based on options and environment
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
    return null; // fallback to deterministic mock
  }

  return null;
}

module.exports = {
  cliAdapter,
  openaiAdapter,
  anthropicAdapter,
  geminiAdapter,
  ollamaAdapter,
  resolveAdapter
};
