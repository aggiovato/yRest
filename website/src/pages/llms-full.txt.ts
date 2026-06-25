import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

// Desired reading order mirrors the sidebar structure
const ORDER: Record<string, number> = {
  "getting-started/introduction": 0,
  "getting-started/quick-start": 1,
  "getting-started/configuration": 2,
  "database/format": 3,
  "database/schema": 4,
  "database/relations": 5,
  "database/query-params": 6,
  "routes/static": 7,
  "routes/templates": 8,
  "routes/scenarios": 9,
  "routes/handlers": 10,
  "routes/sse": 11,
  "routes/websocket": 12,
  "reference/server-modes": 13,
  "reference/programmatic-api": 14,
  "reference/cli-reference": 15,
  "integrations/openapi": 16,
};

function cleanBody(raw: string): string {
  return (
    raw
      // strip frontmatter
      .replace(/^---[\s\S]*?---\n?/, "")
      // strip MDX export statements (component definitions)
      .replace(/^export\s+(const|function|default)[\s\S]*?(?=\n\n|\n#|$)/gm, "")
      // collapse 3+ blank lines to 2
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export const GET: APIRoute = async () => {
  const allDocs = await getCollection("docs");

  // Only include English (root locale) pages — exclude es/, de/, fr/, it/ prefixes
  const docs = allDocs.filter((doc) => !/^(es|de|fr|it)\//.test(doc.id));

  docs.sort((a, b) => {
    const aOrder = ORDER[a.id] ?? 99;
    const bOrder = ORDER[b.id] ?? 99;
    return aOrder - bOrder || a.id.localeCompare(b.id);
  });

  const header = [
    "# yRest — Complete Documentation",
    "",
    "> Full text of all yRest documentation pages in reading order.",
    "> For a structured index with per-page summaries see /llms.txt",
    "",
    `> Generated: ${new Date().toISOString()}`,
  ].join("\n");

  const sections = docs.map((doc) => {
    const title = doc.data.title;
    const description = doc.data.description ? `> ${doc.data.description}\n\n` : "";
    const body = cleanBody(doc.body ?? "");
    const url = `https://yrest-docs.netlify.app/${doc.id}/`;

    return [`<!-- ${url} -->`, `# ${title}`, "", description + body].join("\n");
  });

  const text = [header, ...sections].join("\n\n---\n\n");

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
