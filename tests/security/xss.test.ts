/**
 * Security tests — XSS in /_about
 *
 * Verifies that user-controlled strings from db.yml (_routes paths, handler names,
 * collection names) are HTML-escaped before being inserted into /_about.
 *
 * Attack vectors tested:
 *  • Route path containing <script> tag
 *  • Route path containing attribute-injection payload ("><img onerror=…)
 *  • Handler name containing <script> tag
 *  • Ampersand and quote characters in paths
 *  • SVG onload payload
 *
 * YAML is built programmatically via yaml.stringify() so attack payloads are
 * safely quoted in YAML regardless of their content.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { stringify } from "yaml";
import { createTestServer, cleanup } from "../routes/helpers";
import type { createServer } from "../../src/server/createServer";

// ── Payloads ──────────────────────────────────────────────────────────────────

const SCRIPT_TAG = `<script>alert('XSS')</script>`;
const IMG_ONERROR = `"><img src=x onerror=alert(1)>`;
const QUOTE_AMP = `path&query="value"`;
const SVG_PAYLOAD = `<svg onload=alert(1)>`;

// Build YAML via stringify so special chars are safely quoted by the YAML library
const YAML_XSS = stringify({
  _routes: [
    {
      method: "GET",
      path: `/xss-path/${SCRIPT_TAG}`,
      response: { status: 200, body: { ok: true } },
    },
    {
      method: "GET",
      path: `/attr-inject/${IMG_ONERROR}`,
      response: { status: 200, body: { ok: true } },
    },
    {
      method: "POST",
      path: "/handler-xss",
      handler: SCRIPT_TAG,
      response: { status: 200, body: { ok: true } },
    },
    {
      method: "GET",
      path: `/amp-path/${QUOTE_AMP}`,
      response: { status: 200, body: { ok: true } },
    },
    {
      method: "GET",
      path: `/svg-path/${SVG_PAYLOAD}`,
      response: { status: 200, body: { ok: true } },
    },
  ],
  users: [{ id: 1, name: "Ana" }],
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getAboutHtml(server: Awaited<ReturnType<typeof createServer>>): Promise<string> {
  const res = await server.inject({ method: "GET", url: "/_about" });
  expect(res.statusCode).toBe(200);
  return res.body;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("security — XSS in /_about", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_XSS));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("escapes <script> tags in route paths", async () => {
    const html = await getAboutHtml(server);
    expect(html).not.toContain(`<script>alert('XSS')</script>`);
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes attribute-injection payloads in route paths", async () => {
    const html = await getAboutHtml(server);
    expect(html).not.toContain(`"><img src=x onerror=alert(1)>`);
    expect(html).toContain("&quot;&gt;");
    expect(html).toContain("&lt;img");
  });

  it("escapes <script> tags in handler names", async () => {
    const html = await getAboutHtml(server);
    // Count raw <script> tags — only the ones from the HTML structure itself, not from payloads
    const rawScriptTagsFromPayload = html.includes(`<script>alert`);
    expect(rawScriptTagsFromPayload).toBe(false);
    expect(html).toContain("&lt;script&gt;");
  });

  it('escapes & and " characters in paths', async () => {
    const html = await getAboutHtml(server);
    // Raw & must not appear in HTML attribute context (e.g. inside href="")
    const rawAmpInAttr = /="[^"]*&[^#&][^"]*"/;
    expect(rawAmpInAttr.test(html)).toBe(false);
  });

  it("escapes SVG onload payload in route paths", async () => {
    const html = await getAboutHtml(server);
    expect(html).not.toContain(`<svg onload=alert(1)>`);
    expect(html).toContain("&lt;svg");
  });

  it("/_about page is still valid and returns 200 with escaped content", async () => {
    const res = await server.inject({ method: "GET", url: "/_about" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toContain("<!DOCTYPE html>");
    expect(res.body).toContain("Custom routes");
  });
});
