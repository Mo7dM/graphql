import { getToken, logout } from "./auth.js";
import { gql } from "./graphql.js";
import { roundToDecimal, renderProjects,attachXpHover } from "./utils.js";

const app = document.getElementById("app");

if (!getToken()) window.location.href = "./index.html";
document.getElementById("logoutBtn").addEventListener("click", logout);

const profileQuery = `
    query Dashboard($limit: Int!, $xpLimit: Int!) {
    user {
        id
        login
        email
        auditRatio
        campus
        createdAt
        totalUp
        totalDown
    }

    transaction_aggregate(where: { type: { _eq: "xp" } }) {
        aggregate { sum { amount } }
    }

    currentLevel: transaction(
        where: { type: { _eq: "level" } }
        order_by: { createdAt: desc }
        limit: 1
    ) {
        amount
        createdAt
    }

    xpTx: transaction(
        where: { type: { _eq: "xp" }, amount: { _gt: 0 } }
        order_by: { createdAt: asc }
        limit: $xpLimit
    ) {
        amount
        createdAt
    }

    projectProgress: progress(
        where: { object: { type: { _eq: "project" } } }
        order_by: { updatedAt: desc }
        limit: $limit
    ) {
        grade
        updatedAt
        path
        object { id name type }
    }
    }
`;

// Build cumulative XP points
// Build cumulative XP points from transactions (sorted by createdAt)
function buildXpSeries(xpTx) {
  if (!Array.isArray(xpTx)) return [];

  const daily = {};

  for (const t of xpTx) {
    const amount = Number(t?.amount);
    const date = new Date(t?.createdAt);

    if (!Number.isFinite(amount) || isNaN(date)) continue;

    const key = date.toISOString().slice(0, 10); // YYYY-MM-DD

    daily[key] = (daily[key] || 0) + amount;
  }

  const sortedDays = Object.keys(daily).sort();

  let sum = 0;
  const points = [];

  for (const day of sortedDays) {
    sum += daily[day];
    points.push({
      t: new Date(day).getTime(),
      v: sum
    });
  }

  return points;
}

function drawXpChart(canvas, points) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Ensure consistent size
  const cssW = canvas.clientWidth || 900;
  const cssH = canvas.clientHeight || 420;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const W = cssW, H = cssH;

  // Plot area
  const padL = 60, padR = 24, padT = 58, padB = 44;
  const PW = W - padL - padR;
  const PH = H - padT - padB;

  // Background
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0a1222");
  bg.addColorStop(0.55, "#0f1e34");
  bg.addColorStop(1, "#0a1626");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft vignette
  const vignette = ctx.createRadialGradient(W * 0.55, H * 0.55, 40, W * 0.55, H * 0.55, Math.max(W, H) * 0.75);
  vignette.addColorStop(0, "rgba(255,255,255,0.04)");
  vignette.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.font = "700 22px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText("XP Progress", 28, 38);

  if (!Array.isArray(points) || points.length < 2) {
    ctx.font = "14px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("No XP data.", 28, 70);
    return;
  }

  // X uses index spacing (so no clumping)
  const n = points.length;

  // Y range: start at 0
  const maxV = Math.max(...points.map(p => Number(p.v) || 0), 1);

  const X = (i) => padL + (n <= 1 ? 0 : (i / (n - 1)) * PW);
  const Y = (v) => padT + PH - (v / maxV) * PH;

  // Grid + Y axis ticks
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;

  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillStyle = "rgba(255,255,255,0.65)";

  for (let i = 0; i <= 4; i++) {
    const frac = i / 4; // 0..1
    const y = padT + PH - frac * PH;

    // grid line
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + PW, y);
    ctx.stroke();

    // label
    const val = Math.round(maxV * frac);
    ctx.fillText(String(val), 16, y + 4);
  }

  // X-axis start/end labels (date)
  const startDate = new Date(points[0].t);
  const endDate = new Date(points[n - 1].t);

  const fmtDate = (d) =>
    d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText(fmtDate(startDate), padL, H - 16);
  const endLabel = fmtDate(endDate);
  const endW = ctx.measureText(endLabel).width;
  ctx.fillText(endLabel, padL + PW - endW, H - 16);

  // Step line path
  function strokeStep(style) {
    ctx.save();
    Object.assign(ctx, style);

    ctx.beginPath();
    let y0 = Y(points[0].v);
    ctx.moveTo(X(0), y0);

    for (let i = 1; i < n; i++) {
      const x1 = X(i);
      const y1 = Y(points[i].v);
      ctx.lineTo(x1, y0);
      ctx.lineTo(x1, y1);
      y0 = y1;
    }
    ctx.stroke();
    ctx.restore();
  }

  // Glow pass
  strokeStep({
    lineJoin: "round",
    lineCap: "round",
    strokeStyle: "rgba(120, 200, 255, 0.45)",
    lineWidth: 6,
    shadowColor: "rgba(120, 200, 255, 0.55)",
    shadowBlur: 14,
  });

  // Crisp pass
  strokeStep({
    lineJoin: "round",
    lineCap: "round",
    strokeStyle: "rgba(255,255,255,0.95)",
    lineWidth: 2.8,
    shadowBlur: 0,
  });

  // Small points (not spammy)
  for (let i = 0; i < n; i++) {
    const px = X(i);
    const py = Y(points[i].v);

    ctx.beginPath();
    ctx.fillStyle = "rgba(120, 200, 255, 0.18)";
    ctx.arc(px, py, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.arc(px, py, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Hover interactivity ----
  // Store hit points in canvas object so handler can reuse
  canvas._xpHit = { points, X, Y, padL, padR, padT, padB, W, H, PW, PH, maxV };
}

async function loadProfile() {
  app.innerHTML = `<p>Loading…</p>`;

  try {
    const data = await gql(profileQuery, { limit: 50, xpLimit: 80 });

    const me = data.user[0];
    const totalXp = data.transaction_aggregate.aggregate.sum.amount || 0;
    const level = data.currentLevel[0]?.amount || 0;
    const projects = data.projectProgress || [];

    const xpPoints = buildXpSeries(data.xpTx);

    app.innerHTML = `
      <section class="card">
        <h2>Basic Info</h2>
        <p><b>Username:</b> ${me.login}</p>
        <p><b>Email:</b> ${me.email}</p>
        <p><b>Level:</b> ${level}</p>
        <p><b>Audit Ratio:</b> ${roundToDecimal(me.auditRatio)}</p>
        <p><b>Up:</b> ${roundToDecimal(me.totalUp/1000000,2)} | <b>Down:</b> ${roundToDecimal(me.totalDown/1000000,2)}</p>
      </section>

      <section class="card xp-card">
        <canvas id="xpCanvas" class="xp-canvas"></canvas>
      </section>

      <section class="card">
        <h2>Projects (Pass/Fail)</h2>
        ${renderProjects(projects)}
      </section>
    `;

    const canvas = document.getElementById("xpCanvas");
    drawXpChart(canvas, xpPoints);
    attachXpHover(canvas);

    window.addEventListener("resize", () => {
      drawXpChart(canvas, xpPoints);
    });

  } catch (err) {
    app.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

loadProfile();