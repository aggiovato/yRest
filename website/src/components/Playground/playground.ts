import { parse } from "yaml";
import { highlightYaml, lintYaml, type LintIssue } from "./highlight";
import { generateERData } from "./erData";
import { renderCanvas } from "./erCanvas";

const DEFAULT_YAML = `users:
  - id: 1
    name: Ana Ruiz
    role: admin
  - id: 2
    name: Luis García
    role: user

posts:
  - id: 1
    title: Hello yRest
    body: Getting started with the YAML-powered API mock server.
    userId: 1
    published: true
  - id: 2
    title: Relations made easy
    body: Learn how to use _rel for data relationships.
    userId: 2
    published: true

tags:
  - id: 1
    name: tutorial
  - id: 2
    name: tips

post_tags:
  - postId: 1
    tagId: 1
  - postId: 2
    tagId: 1
  - postId: 2
    tagId: 2

_rel:
  posts:
    userId: "m2o:users[1..1->0..n]"
    tags: "m2m:tags@post_tags(postId,tagId)[0..n->0..n]"

_routes:
  - _method: POST
    _path: /auth/login
    _scenarios:
      - _when:
          body.password: secret
        _response:
          _status: 200
          _body:
            token: "tok-{{body.email}}"
    _otherwise:
      _status: 401
      _body:
        error: Invalid credentials
  - _method: SSE
    _path: /events/posts
    _sse:
      _interval: 2000
      _loop: true
      _events:
        - _event: update
          _data:
            ts: "{{now}}"
            msg: New post available
`;

const EXAMPLES: Record<string, string> = {
  default: DEFAULT_YAML,
  minimal: `users:\n  - id: 1\n    name: Ana\n  - id: 2\n    name: Luis\n`,
  relations: `authors:\n  - id: 1\n    name: Ana\n\nbooks:\n  - id: 1\n    title: YAML by Example\n    authorId: 1\n\nreviews:\n  - id: 1\n    bookId: 1\n    rating: 5\n    comment: Excellent!\n\n_rel:\n  books:\n    authorId: "m2o:authors[1..1->0..n]"\n  reviews:\n    bookId: "m2o:books[1..1->0..n]"\n`,
};

let canvasCleanup: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Must match the CSS: font-size 12px × line-height 1.6 = 19.2px; padding-top 10px
const LINE_H = 12 * 1.6;
const PAD_T = 10;

function syncHighlight(ta: HTMLTextAreaElement, pre: HTMLElement, issues: LintIssue[]) {
  pre.innerHTML = highlightYaml(ta.value, issues) + "\n ";
}

// Uses textContent + \n so numbers render with identical metrics to the code overlay.
function syncLineNumbers(ta: HTMLTextAreaElement, lineNums: HTMLElement) {
  const count = ta.value ? ta.value.split("\n").length : 1;
  const current = parseInt(lineNums.dataset.lc ?? "0");
  if (current === count) return;
  lineNums.dataset.lc = String(count);
  lineNums.textContent = Array.from({ length: count }, (_, i) => i + 1).join("\n");
}

function syncDots(issues: LintIssue[], dotsEl: HTMLElement) {
  dotsEl.innerHTML = "";
  for (const { line, severity, message } of issues) {
    const dot = document.createElement("span");
    dot.className = "yr-ln-dot";
    dot.dataset.sev = severity;
    dot.title = message;
    dot.style.top = `${PAD_T + (line - 1) * LINE_H + LINE_H / 2 - 4}px`;
    dotsEl.appendChild(dot);
  }
}

function updateDiagram(text: string) {
  const canvas = document.getElementById("yr-pg-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  try {
    const data = parse(text) as Record<string, unknown> | null;
    if (!data || typeof data !== "object") return;
    const erData = generateERData(data);
    if (canvasCleanup) {
      canvasCleanup();
      canvasCleanup = null;
    }
    canvasCleanup = renderCanvas(canvas, erData);
  } catch {
    // Parse error — keep existing diagram
  }
}

function scheduleDiagramUpdate(text: string) {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    updateDiagram(text);
    debounceTimer = null;
  }, 600);
}

export function initPlayground() {
  const taRaw = document.getElementById("yr-pg-textarea") as HTMLTextAreaElement | null;
  if (!taRaw || taRaw.dataset.pgInit) return;
  taRaw.dataset.pgInit = "1";
  const ta: HTMLTextAreaElement = taRaw; // explicit non-null type for closures

  const pre = document.getElementById("yr-pg-pre") as HTMLElement;
  const lineNums = document.getElementById("yr-line-nums") as HTMLElement;
  const dotsEl = document.getElementById("yr-ln-dots") as HTMLElement;

  function refresh() {
    const issues = lintYaml(ta.value);
    syncHighlight(ta, pre, issues);
    syncLineNumbers(ta, lineNums);
    syncDots(issues, dotsEl);
  }

  // ── Initial render ─────────────────────────────────────────────────────────
  ta.value = DEFAULT_YAML;
  refresh();
  updateDiagram(DEFAULT_YAML);

  // ── Live update ────────────────────────────────────────────────────────────
  ta.addEventListener("input", () => {
    refresh();
    scheduleDiagramUpdate(ta.value);
  });

  // Tab → insert 2 spaces
  ta.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const s = ta.selectionStart;
    const end = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(end);
    ta.selectionStart = ta.selectionEnd = s + 2;
    refresh();
  });

  // ── Toolbar ────────────────────────────────────────────────────────────────
  const copyBtn = document.getElementById("yr-pg-copy");
  copyBtn?.addEventListener("click", () => {
    navigator.clipboard?.writeText(ta.value).catch(() => {
      const tmp = document.createElement("textarea");
      tmp.value = ta.value;
      tmp.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand("copy");
      document.body.removeChild(tmp);
    });
    if (copyBtn) {
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 1500);
    }
  });

  document.getElementById("yr-pg-clear")?.addEventListener("click", () => {
    ta.value = "";
    refresh();
    scheduleDiagramUpdate("");
  });

  document.getElementById("yr-pg-reset")?.addEventListener("click", () => {
    ta.value = DEFAULT_YAML;
    refresh();
    scheduleDiagramUpdate(DEFAULT_YAML);
  });

  const exampleSel = document.getElementById("yr-pg-example") as HTMLSelectElement | null;
  exampleSel?.addEventListener("change", () => {
    const content = EXAMPLES[exampleSel.value];
    if (!content) return;
    ta.value = content;
    refresh();
    scheduleDiagramUpdate(content);
    exampleSel.value = "";
  });
}
