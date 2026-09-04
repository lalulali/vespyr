const { describe, it } = require("node:test");
const assert = require("node:assert");
const {
  resolveAdapter,
  cliAdapter,
  openaiAdapter,
  anthropicAdapter,
  geminiAdapter,
  ollamaAdapter
} = require("../tools/eval/adapters");
const { executeBenchmark } = require("../tools/eval/runner");

describe("Evaluation Harness Execution Adapters (02j)", () => {
  it("resolveAdapter correctly maps adapter names onto adapter functions", () => {
    assert.strictEqual(resolveAdapter({ adapter: "mock" }), null);
    assert.strictEqual(resolveAdapter({ adapter: "cli" }), cliAdapter);
    assert.strictEqual(resolveAdapter({ adapter: "openai" }), openaiAdapter);
    assert.strictEqual(resolveAdapter({ adapter: "anthropic" }), anthropicAdapter);
    assert.strictEqual(resolveAdapter({ adapter: "gemini" }), geminiAdapter);
    assert.strictEqual(resolveAdapter({ adapter: "ollama" }), ollamaAdapter);
  });

  it("cliAdapter executes external CLI command and returns stdout", async () => {
    const benchmark = {
      id: "TEST-CLI",
      prompt: "Hello CLI adapter"
    };
    const options = {
      cli: 'node -e "process.stdin.pipe(process.stdout);"'
    };
    const res = await cliAdapter(benchmark, { options });
    assert.strictEqual(res.output.trim(), "Hello CLI adapter");
  });

  it("executeBenchmark consumes executionAdapter when provided", async () => {
    const benchmark = {
      id: "TEST-ADAPTER-RUN",
      dimension: "code_quality",
      prompt: "Generate a function"
    };
    const customAdapter = async (bm) => {
      return {
        output: `function add(a, b) {
  if (typeof a !== "number" || typeof b !== "number") {
    throw new TypeError("Inputs must be numbers");
  }
  return a + b;
}

describe("add", () => {
  it("adds numbers correctly", () => {
    assert.strictEqual(add(2, 3), 5);
  });
});
`,
        tokens: 42
      };
    };

    const res = await executeBenchmark(benchmark, { executionAdapter: customAdapter });
    assert.strictEqual(res.passed, true);
    assert.strictEqual(res.tokens, 42);
    assert.ok(res.tier0Passed);
  });
});
