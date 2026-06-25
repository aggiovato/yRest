import type { ERData } from "./erData";

const NW = 178,
  HH = 34,
  FH = 22,
  FP = 10,
  ROW_GAP = 44,
  COL_GAP = 100,
  BR = 12,
  BO = 16,
  MIN_GAP = 10;

function legendHeight(w: number): number {
  return w < 600 ? 108 : 84;
}

const C = {
  bg: "#0d1117",
  nb: "#161b22",
  nh: "#1c2128",
  pb: "#0d1117",
  ph: "#161b22",
  bo: "#30363d",
  bs: "#58a6ff",
  tx: "#e6edf3",
  mu: "#7d8590",
  pk: "#e3b341",
  fk: "#79c0ff",
  m2o: "#58a6ff",
  o2o: "#34d399",
  m2m: "#818cf8",
};

type Node = { e: ERData["entities"][0]; x: number; y: number; w: number; h: number };

const P2D: Record<string, Path2D> = {
  "1..1": new Path2D(
    "M75 40C75 59.33 59.33 75 40 75C20.67 75 5 59.33 5 40C5 20.67 20.67 5 40 5C59.33 5 75 20.67 75 40ZM41 26C41 24.3431 39.6569 23 38 23C36.3431 23 35 24.3431 35 26V37H26V26C26 24.3431 24.6569 23 23 23C21.3431 23 20 24.3431 20 26V37H15C13.3431 37 12 38.3431 12 40C12 41.6569 13.3431 43 15 43H20V54C20 55.6569 21.3431 57 23 57C24.6569 57 26 55.6569 26 54V43H35V54C35 55.6569 36.3431 57 38 57C39.6569 57 41 55.6569 41 54V43H66C67.6569 43 69 41.6569 69 40C69 38.3431 67.6569 37 66 37H41V26Z"
  ),
  "1..n": new Path2D(
    "M40 75C59.33 75 75 59.33 75 40C75 20.67 59.33 5 40 5C20.67 5 5 20.67 5 40C5 59.33 20.67 75 40 75ZM44.9862 42.9025L18.6801 58.0904C17.2452 58.9188 15.4105 58.4272 14.582 56.9923C13.7536 55.5574 14.2452 53.7227 15.6801 52.8942L32.9862 42.9025H17C15.3431 42.9025 14 41.5594 14 39.9025C14 38.2457 15.3431 36.9025 17 36.9025H32.9862L15.5981 26.5986C14.1632 25.7702 13.6716 23.9354 14.5 22.5005C15.3284 21.0656 17.1632 20.574 18.5981 21.4024L44.9862 36.9025H46V26C46 24.3431 47.3431 23 49 23C50.6569 23 52 24.3431 52 26V36.9025H68C69.6569 36.9025 71 38.2457 71 39.9025C71 41.5594 69.6569 42.9025 68 42.9025H52V53C52 54.6569 50.6569 56 49 56C47.3431 56 46 54.6569 46 53V42.9025H44.9862Z"
  ),
  "0..1": new Path2D(
    "M75 40C75 59.33 59.33 75 40 75C20.67 75 5 59.33 5 40C5 20.67 20.67 5 40 5C59.33 5 75 20.67 75 40ZM23 57C24.6569 57 26 55.6569 26 54V43H33.3781C34.7102 48.1757 39.4085 52 45 52C50.5915 52 55.2898 48.1757 56.6219 43H66C67.6569 43 69 41.6569 69 40C69 38.3431 67.6569 37 66 37H56.6219C55.2898 31.8243 50.5915 28 45 28C39.4085 28 34.7102 31.8243 33.3781 37H26V26C26 24.3431 24.6569 23 23 23C21.3431 23 20 24.3431 20 26V37H15C13.3431 37 12 38.3431 12 40C12 41.6569 13.3431 43 15 43H20V54C20 55.6569 21.3431 57 23 57ZM51 40C51 41.0929 50.7078 42.1175 50.1973 43C49.1599 44.7934 47.2208 46 45 46C42.7792 46 40.8401 44.7934 39.8027 43C39.2922 42.1175 39 41.0929 39 40C39 38.9071 39.2922 37.8825 39.8027 37C40.8401 35.2066 42.7792 34 45 34C47.2208 34 49.1599 35.2066 50.1973 37C50.7078 37.8825 51 38.9071 51 40Z"
  ),
  "0..n": new Path2D(
    "M40 75C59.33 75 75 59.33 75 40C75 20.67 59.33 5 40 5C20.67 5 5 20.67 5 40C5 59.33 20.67 75 40 75ZM17 42.9025C15.3431 42.9025 14 41.5594 14 39.9025C14 38.2457 15.3431 36.9025 17 36.9025H32.9862L15.5981 26.5986C14.1632 25.7702 13.6716 23.9354 14.5 22.5005C15.3284 21.0656 17.1632 20.574 18.5981 21.4024L45.4091 36.8818L45.4036 36.9025H45.445L45.4091 36.8818C46.7819 31.7662 51.4511 28 57 28C62.579 28 67.2687 31.8072 68.6129 36.9652C69.9758 37.2481 71 38.4557 71 39.9025C71 41.331 70.0017 42.5262 68.6647 42.8286C67.3931 48.091 62.6531 52 57 52C51.3734 52 46.6513 48.1276 45.3534 42.9025H44.9862L18.6801 58.0904C17.2452 58.9188 15.4105 58.4272 14.582 56.9923C13.7536 55.5574 14.2452 53.7227 15.6801 52.8942L32.9862 42.9025H17ZM62.1397 36.9025C61.0891 35.163 59.1804 34 57 34C54.8196 34 52.9109 35.163 51.8603 36.9025C51.3142 37.8067 51 38.8667 51 40C51 41.0529 51.2712 42.0424 51.7475 42.9025C52.7704 44.7496 54.7392 46 57 46C59.2608 46 61.2296 44.7496 62.2525 42.9025C62.7288 42.0424 63 41.0529 63 40C63 38.8667 62.6858 37.8067 62.1397 36.9025Z"
  ),
  n: new Path2D(
    "M40 75C59.33 75 75 59.33 75 40C75 20.67 59.33 5 40 5C20.67 5 5 20.67 5 40C5 59.33 20.67 75 40 75ZM17 36.9025H33.0677L15.5981 26.5986C14.1632 25.7702 13.6716 23.9354 14.5 22.5005C15.3284 21.0656 17.1632 20.574 18.5981 21.4024L44.9862 36.9025H68C69.6569 36.9025 71 38.2457 71 39.9025C71 41.5594 69.6569 42.9025 68 42.9025H44.9862L18.6801 58.0904C17.2452 58.9188 15.4105 58.4272 14.582 56.9923C13.7536 55.5574 14.2452 53.7227 15.6801 52.8942L32.9862 42.9025H17C15.3431 42.9025 14 41.5594 14 39.9025C14 38.2457 15.3431 36.9025 17 36.9025Z"
  ),
};

export function renderCanvas(cv: HTMLCanvasElement, D: ERData): () => void {
  if (!D.entities.length) {
    const drawEmpty = () => {
      const c = cv.getContext("2d")!;
      const d = window.devicePixelRatio || 1;
      const r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return;
      cv.width = Math.round(r.width * d);
      cv.height = Math.round(r.height * d);
      c.setTransform(d, 0, 0, d, 0, 0);
      c.fillStyle = C.bg;
      c.fillRect(0, 0, r.width, r.height);
      c.fillStyle = C.mu;
      c.font = "13px monospace";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("Add collections to see the ER diagram", r.width / 2, r.height / 2);
    };
    requestAnimationFrame(drawEmpty);
    const roE = new ResizeObserver(drawEmpty);
    roE.observe(cv);
    return () => roE.disconnect();
  }

  let dpr = window.devicePixelRatio || 1;
  let ctx = cv.getContext("2d")!;

  const nodes: Node[] = D.entities.map((e) => ({
    e,
    x: 0,
    y: 0,
    w: NW,
    h: HH + e.fields.length * FH + 6,
  }));

  const nIdx: Record<string, number> = {};
  D.entities.forEach((e, i) => {
    nIdx[e.name] = i;
  });

  const adj = nodes.map(() => [] as number[]);
  const radj = nodes.map(() => [] as number[]);

  D.relations.forEach((r) => {
    if (r.type === "many2many" && r.through && nIdx[r.through] != null) {
      const s = nIdx[r.source],
        p = nIdx[r.through],
        t = nIdx[r.target];
      if (s != null && p != null && s !== p) {
        adj[s].push(p);
        radj[p].push(s);
      }
      if (t != null && p != null && t !== p) {
        adj[t].push(p);
        radj[p].push(t);
      }
    } else {
      const s = nIdx[r.source],
        t = nIdx[r.target];
      if (s == null || t == null || s === t) return;
      adj[s].push(t);
      radj[t].push(s);
    }
  });

  function resize(h?: number) {
    if (h) cv.style.minHeight = h + "px";
    const r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
  }

  function computeNodeWidths() {
    nodes.forEach((n) => {
      const e = n.e;
      ctx.font = "600 12px -apple-system,BlinkMacSystemFont,sans-serif";
      let hdrW = FP + ctx.measureText(e.name).width + FP;
      if (e.isPivot) {
        ctx.font = "9px monospace";
        hdrW += ctx.measureText("pivot").width + FP;
      }
      let maxRow = hdrW;
      e.fields.forEach((f) => {
        const leftPad = FP + (f.pk || f.fk ? 16 : 0);
        const rightPad = (f.required && !f.pk ? 14 : 0) + FP;
        ctx.font = (f.required && !f.pk ? "600 " : "") + "11px monospace";
        const nw = ctx.measureText(f.name).width;
        ctx.font = "10px monospace";
        const tw = ctx.measureText(f.type).width;
        maxRow = Math.max(maxRow, leftPad + nw + MIN_GAP + tw + rightPad);
      });
      n.w = Math.max(NW, Math.ceil(maxRow));
    });
  }

  let groups: number[][] = [];

  function median(arr: number[]) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }

  function computeLayout(W: number, H: number) {
    const layer = nodes.map(() => 0);
    const inDeg = nodes.map(() => 0);
    adj.forEach((ts) => ts.forEach((t) => inDeg[t]++));
    const q: number[] = [],
      qi = { v: 0 };
    for (let i = 0; i < nodes.length; i++) if (inDeg[i] === 0) q.push(i);
    if (!q.length) for (let i = 0; i < nodes.length; i++) q.push(i);
    while (qi.v < q.length) {
      const u = q[qi.v++];
      adj[u].forEach((v) => {
        if (layer[v] <= layer[u]) {
          layer[v] = layer[u] + 1;
          q.push(v);
        }
      });
    }
    const maxL = layer.reduce((m, l) => Math.max(m, l), 0);
    groups = [];
    for (let l = 0; l <= maxL; l++) groups.push([]);
    for (let i = 0; i < nodes.length; i++) groups[layer[i]].push(i);
    for (let l = 1; l <= maxL; l++) {
      const pp: Record<number, number> = {};
      groups[l - 1].forEach((i, p) => {
        pp[i] = p;
      });
      groups[l].sort(
        (a, b) => median(radj[a].map((x) => pp[x] ?? 0)) - median(radj[b].map((x) => pp[x] ?? 0))
      );
    }
    for (let l = maxL - 1; l >= 0; l--) {
      const np: Record<number, number> = {};
      groups[l + 1].forEach((i, p) => {
        np[i] = p;
      });
      groups[l].sort(
        (a, b) => median(adj[a].map((x) => np[x] ?? 0)) - median(adj[b].map((x) => np[x] ?? 0))
      );
    }
    const maxNW = nodes.reduce((m, n) => Math.max(m, n.w), NW);
    const colW = maxNW + COL_GAP;
    const totalW = (maxL + 1) * colW - COL_GAP;
    const startX = Math.max(20, (W - totalW) / 2);
    for (let l = 0; l <= maxL; l++) {
      const g = groups[l];
      const totalH = g.reduce((s, i) => s + nodes[i].h, 0) + (g.length - 1) * ROW_GAP;
      let y = Math.max(20, (H - totalH) / 2);
      g.forEach((i) => {
        nodes[i].x = startX + l * colW;
        nodes[i].y = y;
        y += nodes[i].h + ROW_GAP;
      });
    }
  }

  const pan = { x: 0, y: 0 };
  let zm = 1;
  let origPos: Array<{ x: number; y: number }> = [];

  function savePos() {
    origPos = nodes.map((n) => ({ x: n.x, y: n.y }));
  }

  function fitView(W: number, H: number) {
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    nodes.forEach((n) => {
      x0 = Math.min(x0, n.x);
      y0 = Math.min(y0, n.y);
      x1 = Math.max(x1, n.x + n.w);
      y1 = Math.max(y1, n.y + n.h);
    });
    const pad = 28,
      gW = x1 - x0 + pad * 2,
      gH = y1 - y0 + pad * 2;
    zm = Math.min(W / gW, (H - legendHeight(W)) / gH, 1);
    pan.x = (W - gW * zm) / 2 + pad * zm - x0 * zm;
    pan.y = pad - y0 * zm; // top-aligned instead of vertically centered
  }

  type RoundRectCtx = CanvasRenderingContext2D & {
    roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
  };

  function rr(x: number, y: number, w: number, h: number, r: number) {
    const typedCtx = ctx as RoundRectCtx;
    if (typedCtx.roundRect) {
      ctx.beginPath();
      typedCtx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function edgePt(n: Node, tx: number, ty: number) {
    const cx = n.x + n.w / 2,
      cy = n.y + n.h / 2,
      dx = tx - cx,
      dy = ty - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    const s = Math.min(n.w / 2 / Math.abs(dx || 0.001), n.h / 2 / Math.abs(dy || 0.001));
    return { x: cx + dx * s, y: cy + dy * s };
  }

  let badges: Array<{ x: number; y: number; ux: number; uy: number; car: string; col: string }> =
    [];

  function pushBadge(x: number, y: number, ux: number, uy: number, car: string, col: string) {
    badges.push({ x, y, ux, uy, car, col });
  }

  function drawBadge(b: (typeof badges)[0]) {
    const p = P2D[b.car] ?? P2D["n"];
    const sc = BR / 40;
    ctx.save();
    ctx.translate(b.x + b.ux * BO, b.y + b.uy * BO);
    ctx.rotate(Math.atan2(b.uy, b.ux));
    ctx.scale(sc, sc);
    ctx.translate(-40, -40);
    ctx.fillStyle = b.col;
    ctx.fill(p, "evenodd");
    ctx.restore();
  }

  function ecol(t: string) {
    return t === "one2one" ? C.o2o : t === "many2many" ? C.m2m : C.m2o;
  }

  function drawEdgeLine(
    a: Node,
    b: Node,
    col: string,
    dashed: boolean,
    label: string,
    carA: string,
    carB: string,
    off: number
  ) {
    const p1 = edgePt(a, b.x + b.w / 2, b.y + b.h / 2);
    const p2 = edgePt(b, a.x + a.w / 2, a.y + a.h / 2);
    const dx = p2.x - p1.x,
      dy = p2.y - p1.y,
      d = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / d,
      uy = dy / d;
    const px = -uy * off,
      py = ux * off;
    const q1x = p1.x + px,
      q1y = p1.y + py,
      q2x = p2.x + px,
      q2y = p2.y + py;
    ctx.strokeStyle = col + "55";
    ctx.lineWidth = 1.5;
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(q1x, q1y);
    ctx.lineTo(q2x, q2y);
    ctx.stroke();
    ctx.setLineDash([]);
    pushBadge(q1x, q1y, ux, uy, carA, col);
    pushBadge(q2x, q2y, -ux, -uy, carB, col);
    if (label) {
      const mx = (q1x + q2x) / 2,
        my = (q1y + q2y) / 2;
      let la = Math.atan2(uy, ux);
      if (la > Math.PI / 2 || la < -Math.PI / 2) la += Math.PI;
      const ls = off > 0 ? 11 : -11;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(la);
      ctx.fillStyle = C.mu;
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 0, ls);
      ctx.restore();
    }
  }

  function pairKey(a: Node, b: Node) {
    const ai = nodes.indexOf(a),
      bi = nodes.indexOf(b);
    return ai < bi ? `${ai}-${bi}` : `${bi}-${ai}`;
  }

  function collectEdges() {
    const edges: Array<{
      a: Node;
      b: Node;
      col: string;
      dashed: boolean;
      label: string;
      carA: string;
      carB: string;
      off: number;
    }> = [];
    D.relations.forEach((r) => {
      const col = ecol(r.type);
      if (r.type === "many2many" && r.through && nIdx[r.through] != null) {
        const sn = nodes[nIdx[r.source]],
          pn = nodes[nIdx[r.through]],
          tn = nodes[nIdx[r.target]];
        if (sn && pn)
          edges.push({
            a: sn,
            b: pn,
            col,
            dashed: true,
            label: r.foreignKey ?? "",
            carA: r.fkCarDirect ?? "1..1",
            carB: r.fkCarInverse ?? "0..n",
            off: 0,
          });
        if (tn && pn)
          edges.push({
            a: tn,
            b: pn,
            col,
            dashed: true,
            label: r.otherKey ?? "",
            carA: r.otherCarDirect ?? "1..1",
            carB: r.otherCarInverse ?? "0..n",
            off: 0,
          });
      } else {
        const sn = nodes[nIdx[r.source]],
          tn = nodes[nIdx[r.target]];
        if (sn && tn && sn !== tn) {
          const carA = r.carInverse ?? (r.type !== "one2one" ? "1..n" : "1..1");
          const carB = r.carDirect ?? (r.type === "many2many" ? "1..n" : "1..1");
          edges.push({ a: sn, b: tn, col, dashed: false, label: r.label, carA, carB, off: 0 });
        }
      }
    });
    const cnt: Record<string, number> = {},
      idx: Record<string, number> = {};
    edges.forEach((e) => {
      const k = pairKey(e.a, e.b);
      cnt[k] = (cnt[k] ?? 0) + 1;
    });
    edges.forEach((e) => {
      const k = pairKey(e.a, e.b),
        n = cnt[k];
      const i = idx[k] ?? 0;
      e.off = n > 1 ? (i - (n - 1) / 2) * 16 : 0;
      idx[k] = i + 1;
    });
    return edges;
  }

  let drag: Node | null = null;

  function drawNode(n: Node) {
    const { x, y, w, h, e } = n;
    const bg = e.isPivot ? C.pb : C.nb,
      hd = e.isPivot ? C.ph : C.nh;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = bg;
    rr(x, y, w, h, 7);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = bg;
    rr(x, y, w, h, 7);
    ctx.fill();
    ctx.strokeStyle = n === drag ? C.bs : C.bo;
    ctx.lineWidth = 1.2;
    rr(x, y, w, h, 7);
    ctx.stroke();
    ctx.fillStyle = hd;
    rr(x, y, w, HH, 7);
    ctx.fill();
    ctx.fillRect(x, y + HH - 7, w, 7);
    ctx.strokeStyle = C.bo;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + HH);
    ctx.lineTo(x + w, y + HH);
    ctx.stroke();
    ctx.fillStyle = e.isPivot ? C.mu : C.tx;
    ctx.font = "600 12px -apple-system,BlinkMacSystemFont,sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(e.name, x + FP, y + HH / 2);
    if (e.isPivot) {
      ctx.fillStyle = "#3d444d";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText("pivot", x + w - FP, y + HH / 2);
    }
    e.fields.forEach((f, fi) => {
      const fy = y + HH + fi * FH + FH / 2 + 3;
      ctx.fillStyle = C.mu;
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(f.type, x + w - FP - (f.required && !f.pk ? 14 : 0), fy);
      if (f.pk || f.fk) {
        const tag = f.pk ? "PK" : "FK",
          tc = f.pk ? C.pk : C.fk;
        ctx.fillStyle = tc + "22";
        ctx.strokeStyle = tc + "66";
        ctx.lineWidth = 1;
        rr(x + FP, fy - 6, 12, 12, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = tc;
        ctx.font = "7px monospace";
        ctx.textAlign = "center";
        ctx.fillText(tag, x + FP + 6, fy + 0.5);
      }
      ctx.fillStyle = f.pk ? C.pk : f.fk ? C.fk : C.tx;
      ctx.font = (f.required && !f.pk ? "600 " : "") + "11px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(f.name, x + FP + (f.pk || f.fk ? 16 : 0), fy);
      if (f.required && !f.pk) {
        ctx.fillStyle = "#f85149";
        ctx.beginPath();
        ctx.arc(x + w - FP - 6, fy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.textBaseline = "alphabetic";
  }

  function drawLegend() {
    const cvW = cv.width / dpr,
      cvH = cv.height / dpr;
    const lgH = legendHeight(cvW);
    const yL = cvH - lgH;

    ctx.fillStyle = "#161b22";
    ctx.fillRect(0, yL, cvW, lgH);
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yL);
    ctx.lineTo(cvW, yL);
    ctx.stroke();

    function legendBadge(cx: number, cy: number, car: string, col: string, angle: number) {
      const p = P2D[car] ?? P2D["n"],
        sc = 8 / 40;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.scale(sc, sc);
      ctx.translate(-40, -40);
      ctx.fillStyle = col;
      ctx.fill(p, "evenodd");
      ctx.restore();
    }

    const types = [
      { c: C.m2o, l: "many2one", d: false },
      { c: C.o2o, l: "one2one", d: false },
      { c: C.m2m, l: "many2many", d: true },
    ];
    const pairs = [
      { carA: "1..n", carB: "1..1", col: C.m2o, l: "many2one (N:1)" },
      { carA: "1..1", carB: "1..1", col: C.o2o, l: "one2one (1:1)" },
      { carA: "1..1", carB: "0..n", col: C.m2m, l: "pivot edge (1:0..N)" },
    ];
    const symbols = [
      { car: "1..1", l: "exactly one" },
      { car: "0..1", l: "zero or one" },
      { car: "1..n", l: "one or more" },
      { car: "0..n", l: "zero or more" },
      { car: "n", l: "many (pivot)" },
    ];

    if (cvW < 600) {
      // Mobile: 4 rows stacked vertically
      const r1 = yL + 15,
        r2 = yL + 35,
        r3 = yL + 57,
        r4 = yL + 82;

      // Row 1: relation type color lines + labels
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      let x = 12;
      types.forEach((it) => {
        ctx.strokeStyle = it.c;
        ctx.lineWidth = 1.5;
        ctx.setLineDash(it.d ? [4, 3] : []);
        ctx.beginPath();
        ctx.moveTo(x, r1);
        ctx.lineTo(x + 14, r1);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = C.mu;
        ctx.fillText(it.l, x + 18, r1);
        x += 18 + ctx.measureText(it.l).width + 14;
      });

      // Row 2: interaction hint
      ctx.fillStyle = "#3d444d";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("drag  ·  pinch to zoom  ·  dbl-tap to reset", 12, r2);

      // Row 3: paired cardinality examples
      x = 12;
      pairs.forEach((p) => {
        ctx.strokeStyle = p.col + "55";
        ctx.lineWidth = 1.2;
        ctx.setLineDash(p.col === C.m2m ? [4, 3] : []);
        ctx.beginPath();
        ctx.moveTo(x + 8, r3);
        ctx.lineTo(x + 40, r3);
        ctx.stroke();
        ctx.setLineDash([]);
        legendBadge(x + 8, r3, p.carA, p.col, 0);
        legendBadge(x + 40, r3, p.carB, p.col, Math.PI);
        ctx.fillStyle = C.mu;
        ctx.font = "10px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(p.l, x + 50, r3);
        x += 50 + ctx.measureText(p.l).width + 10;
      });

      // Row 4: cardinality symbols
      x = 12;
      symbols.forEach((s) => {
        legendBadge(x + 8, r4, s.car, C.mu, 0);
        ctx.fillStyle = C.mu;
        ctx.font = "10px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(s.l, x + 20, r4);
        x += 20 + ctx.measureText(s.l).width + 12;
      });
    } else {
      // Desktop: 3-row horizontal layout
      const y1 = yL + 13,
        y2 = yL + 35,
        y3 = yL + 62;

      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = "10px monospace";
      let x = 14;
      types.forEach((it) => {
        ctx.strokeStyle = it.c;
        ctx.lineWidth = 1.5;
        ctx.setLineDash(it.d ? [4, 3] : []);
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x + 14, y1);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = C.mu;
        ctx.fillText(it.l, x + 18, y1);
        x += 18 + ctx.measureText(it.l).width + 22;
      });

      x = 14;
      pairs.forEach((p) => {
        ctx.strokeStyle = p.col + "55";
        ctx.lineWidth = 1.2;
        ctx.setLineDash(p.col === C.m2m ? [4, 3] : []);
        ctx.beginPath();
        ctx.moveTo(x + 8, y2);
        ctx.lineTo(x + 56, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        legendBadge(x + 8, y2, p.carA, p.col, 0);
        legendBadge(x + 56, y2, p.carB, p.col, Math.PI);
        ctx.fillStyle = C.mu;
        ctx.font = "10px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(p.l, x + 66, y2);
        x += 66 + ctx.measureText(p.l).width + 24;
      });

      x = 14;
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      symbols.forEach((s) => {
        legendBadge(x + 8, y3, s.car, C.mu, 0);
        ctx.fillStyle = C.mu;
        ctx.fillText(s.l, x + 20, y3);
        x += 20 + ctx.measureText(s.l).width + 18;
      });

      ctx.fillStyle = "#3d444d";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("drag  ·  scroll to zoom  ·  dbl-click to reset", cvW - 14, y1);
    }

    ctx.textBaseline = "alphabetic";
  }

  function draw() {
    const W = cv.width / dpr,
      H = cv.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zm, zm);
    badges = [];
    const edges = collectEdges();
    edges.forEach((e) => drawEdgeLine(e.a, e.b, e.col, e.dashed, e.label, e.carA, e.carB, e.off));
    nodes.forEach((n) => drawNode(n));
    badges.forEach((b) => drawBadge(b));
    ctx.restore();
    drawLegend();
  }

  // ── Interaction ──────────────────────────────────────────────────────────────
  let dox = 0,
    doy = 0,
    isPan = false;
  const ps = { x: 0, y: 0 };

  function toW(mx: number, my: number) {
    return { x: (mx - pan.x) / zm, y: (my - pan.y) / zm };
  }
  function hitTest(wx: number, wy: number) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (wx >= n.x && wx <= n.x + n.w && wy >= n.y && wy <= n.y + n.h) return n;
    }
    return null;
  }

  const onMouseDown = (ev: MouseEvent) => {
    const r = cv.getBoundingClientRect(),
      mx = ev.clientX - r.left,
      my = ev.clientY - r.top;
    const w = toW(mx, my),
      h = hitTest(w.x, w.y);
    if (h) {
      drag = h;
      dox = w.x - h.x;
      doy = w.y - h.y;
    } else {
      isPan = true;
      ps.x = mx - pan.x;
      ps.y = my - pan.y;
    }
    cv.style.cursor = "grabbing";
  };
  const onMouseMove = (ev: MouseEvent) => {
    if (!drag && !isPan) return;
    const r = cv.getBoundingClientRect(),
      mx = ev.clientX - r.left,
      my = ev.clientY - r.top;
    if (drag) {
      const w = toW(mx, my);
      drag.x = w.x - dox;
      drag.y = w.y - doy;
    } else {
      pan.x = mx - ps.x;
      pan.y = my - ps.y;
    }
    draw();
  };
  const onMouseUp = () => {
    drag = null;
    isPan = false;
    cv.style.cursor = "grab";
  };
  const onWheel = (ev: WheelEvent) => {
    ev.preventDefault();
    const r = cv.getBoundingClientRect(),
      mx = ev.clientX - r.left,
      my = ev.clientY - r.top;
    const d = ev.deltaY < 0 ? 1.1 : 0.91,
      nz = Math.max(0.25, Math.min(3, zm * d));
    pan.x = mx - (mx - pan.x) * (nz / zm);
    pan.y = my - (my - pan.y) * (nz / zm);
    zm = nz;
    draw();
  };
  const onDblClick = () => {
    nodes.forEach((n, i) => {
      n.x = origPos[i].x;
      n.y = origPos[i].y;
    });
    const r = cv.getBoundingClientRect();
    fitView(r.width, r.height);
    draw();
  };
  const onResize = () => {
    dpr = window.devicePixelRatio || 1;
    ctx = cv.getContext("2d")!;
    resize();
    const r = cv.getBoundingClientRect();
    computeLayout(r.width, r.height);
    savePos();
    fitView(r.width, r.height);
    draw();
  };

  cv.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  cv.addEventListener("wheel", onWheel, { passive: false });
  cv.addEventListener("dblclick", onDblClick);
  window.addEventListener("resize", onResize);

  // ── Touch interaction ─────────────────────────────────────────────────────
  let lastTap = 0;
  let pinchDist0 = 0;
  let pinchZm0 = 1;

  const onTouchStart = (ev: TouchEvent) => {
    ev.preventDefault();
    if (ev.touches.length === 1) {
      const r = cv.getBoundingClientRect();
      const mx = ev.touches[0].clientX - r.left;
      const my = ev.touches[0].clientY - r.top;
      const w = toW(mx, my),
        h = hitTest(w.x, w.y);
      if (h) {
        drag = h;
        dox = w.x - h.x;
        doy = w.y - h.y;
      } else {
        isPan = true;
        ps.x = mx - pan.x;
        ps.y = my - pan.y;
      }
      const now = Date.now();
      if (now - lastTap < 300) {
        nodes.forEach((n, i) => {
          n.x = origPos[i].x;
          n.y = origPos[i].y;
        });
        const br = cv.getBoundingClientRect();
        fitView(br.width, br.height);
        draw();
      }
      lastTap = now;
    } else if (ev.touches.length === 2) {
      drag = null;
      isPan = false;
      const t1 = ev.touches[0],
        t2 = ev.touches[1];
      pinchDist0 = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchZm0 = zm;
    }
  };

  const onTouchMove = (ev: TouchEvent) => {
    ev.preventDefault();
    if (ev.touches.length === 1) {
      const r = cv.getBoundingClientRect();
      const mx = ev.touches[0].clientX - r.left;
      const my = ev.touches[0].clientY - r.top;
      if (drag) {
        const w = toW(mx, my);
        drag.x = w.x - dox;
        drag.y = w.y - doy;
      } else if (isPan) {
        pan.x = mx - ps.x;
        pan.y = my - ps.y;
      }
      draw();
    } else if (ev.touches.length === 2 && pinchDist0 > 0) {
      const r = cv.getBoundingClientRect();
      const t1 = ev.touches[0],
        t2 = ev.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const nz = Math.max(0.25, Math.min(3, pinchZm0 * (dist / pinchDist0)));
      const mx = (t1.clientX + t2.clientX) / 2 - r.left;
      const my = (t1.clientY + t2.clientY) / 2 - r.top;
      pan.x = mx - (mx - pan.x) * (nz / zm);
      pan.y = my - (my - pan.y) * (nz / zm);
      zm = nz;
      draw();
    }
  };

  const onTouchEnd = () => {
    drag = null;
    isPan = false;
  };

  cv.addEventListener("touchstart", onTouchStart, { passive: false });
  cv.addEventListener("touchmove", onTouchMove, { passive: false });
  cv.addEventListener("touchend", onTouchEnd);

  // ResizeObserver: refit when the canvas grows (e.g. editor grows → grid stretch)
  const ro = new ResizeObserver(() => {
    if (!cv.isConnected) return;
    dpr = window.devicePixelRatio || 1;
    ctx = cv.getContext("2d")!;
    resize();
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    fitView(r.width, r.height);
    draw();
  });
  ro.observe(cv);

  // ── Init ──────────────────────────────────────────────────────────────────────
  requestAnimationFrame(() => {
    computeNodeWidths();
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    resize();
    computeLayout(r.width, r.height);
    savePos();
    fitView(r.width, r.height);
    draw();
  });

  return () => {
    ro.disconnect();
    cv.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    cv.removeEventListener("wheel", onWheel);
    cv.removeEventListener("dblclick", onDblClick);
    window.removeEventListener("resize", onResize);
    cv.removeEventListener("touchstart", onTouchStart);
    cv.removeEventListener("touchmove", onTouchMove);
    cv.removeEventListener("touchend", onTouchEnd);
  };
}
