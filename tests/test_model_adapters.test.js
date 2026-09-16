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
    // Token provenance (review 04 §5): provider usage and the local counter
    // are incommensurable units — `tokens` is always the local count;
    // provider figures ride alongside in `providerTokens`.
    const { countTokens } = require("../tools/eval/lib/tokenizer");
    assert.strictEqual(res.tokens, countTokens(res.output));
    assert.strictEqual(res.providerTokens, 42);
    assert.strictEqual(res.tokenSource, "provider+local");
    assert.strictEqual(res.mock, false);
    assert.ok(res.tier0Passed);
  });

  describe("Boundary Adapter Fault Injection & Negative Controls (Demonstrated Red)", () => {
    const http = require("node:http");

    it("openaiAdapter cleanly rejects on HTTP 429 Rate Limit", async () => {
      const server = http.createServer((req, res) => {
        res.writeHead(429, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "Rate limit reached" } }));
      });

      await new Promise((resolve) => server.listen(0, resolve));
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        const benchmark = { id: "TEST-429", prompt: "Hello" };
        const options = { baseUrl, apiKey: "test-key" };
        await assert.rejects(
          async () => {
            await openaiAdapter(benchmark, { options });
          },
          (err) => {
            assert.ok(err.message.includes("OpenAI API request failed (429)"));
            assert.ok(err.message.includes("Rate limit reached"));
            return true;
          }
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    it("openaiAdapter cleanly rejects on HTTP 500 Server Error", async () => {
      const server = http.createServer((req, res) => {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      });

      await new Promise((resolve) => server.listen(0, resolve));
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        const benchmark = { id: "TEST-500", prompt: "Hello" };
        const options = { baseUrl, apiKey: "test-key" };
        await assert.rejects(
          async () => {
            await openaiAdapter(benchmark, { options });
          },
          (err) => {
            assert.ok(err.message.includes("OpenAI API request failed (500)"));
            assert.ok(err.message.includes("Internal Server Error"));
            return true;
          }
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    it("openaiAdapter cleanly aborts on timeout when server hangs", async () => {
      const server = http.createServer((req, res) => {
        // Intentionally hang: never respond
      });

      await new Promise((resolve) => server.listen(0, resolve));
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        const benchmark = { id: "TEST-TIMEOUT", prompt: "Hello" };
        const options = { baseUrl, apiKey: "test-key", timeout: 50 };
        await assert.rejects(
          async () => {
            await openaiAdapter(benchmark, { options });
          },
          (err) => {
            assert.ok(err.name === "TimeoutError" || err.name === "AbortError" || err.message.includes("aborted"));
            return true;
          }
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    it("ollamaAdapter cleanly rejects on HTTP 503 Service Unavailable", async () => {
      const server = http.createServer((req, res) => {
        res.writeHead(503, { "Content-Type": "text/plain" });
        res.end("Service Unavailable");
      });

      await new Promise((resolve) => server.listen(0, resolve));
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        const benchmark = { id: "TEST-OLLAMA-503", prompt: "Hello" };
        const options = { baseUrl };
        await assert.rejects(
          async () => {
            await ollamaAdapter(benchmark, { options });
          },
          (err) => {
            assert.ok(err.message.includes("Ollama API request failed (503)"));
            return true;
          }
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });
  });
});
