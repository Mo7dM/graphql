export function roundToDecimal(num, precision=1) {
    const factor = Math.pow(10, precision);
    return Math.round(num * factor) / factor;
}

export function renderProjects(projects) {
    if (!projects || projects.length === 0) {
        return `<p>No projects found.</p>`;
    }

    return `
    <table class="projects-table">
        <thead>
        <tr>
            <th>Project</th>
            <th>Grade</th>
            <th>Updated</th>
        </tr>
        </thead>
        <tbody>
        ${projects.map(p => {
            const name = p.object?.name ?? "Unknown";
            const grade = (p.grade ?? "-");
            const path = p.path ?? "-";
            const updated = p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "-";
            let pass = ""
            if (grade>=1){
                pass = "Pass"
            }else if (grade<1){
                pass = "Fail"
            }else{
                pass="Unsubmitted"
            }
            return `
            <tr>
                <td>${name}</td>
                <td>${pass}</td>
                <td>${updated}</td>
            </tr>
            `;
        }).join("")}
        </tbody>
    </table>
    `;
}

export function attachXpHover(canvas) {
  const tooltip = document.createElement("div");
  tooltip.style.position = "fixed";
  tooltip.style.pointerEvents = "none";
  tooltip.style.padding = "8px 10px";
  tooltip.style.borderRadius = "10px";
  tooltip.style.background = "rgba(0,0,0,0.75)";
  tooltip.style.color = "white";
  tooltip.style.font = "12px system-ui";
  tooltip.style.opacity = "0";
  tooltip.style.transition = "opacity 120ms";
  tooltip.style.zIndex = "9999";
  document.body.appendChild(tooltip);

  function fmtXP(n) {
    // show k / M
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
    return String(Math.round(n));
  }

  function fmtDateFull(t) {
    return new Date(t).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }

  canvas.addEventListener("mousemove", (e) => {
    const meta = canvas._xpHit;
    if (!meta) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Find nearest point by x (index spacing)
    const n = meta.points.length;
    const i = Math.round(((mx - meta.padL) / meta.PW) * (n - 1));
    const idx = Math.max(0, Math.min(n - 1, i));

    const px = meta.X(idx);
    const py = meta.Y(meta.points[idx].v);

    // Only show tooltip if cursor is near the line/dot
    const dx = mx - px;
    const dy = my - py;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 18) {
      tooltip.style.opacity = "1";
      tooltip.innerHTML = `
        <div style="font-weight:700">${fmtDateFull(meta.points[idx].t)}</div>
        <div>XP: ${fmtXP(meta.points[idx].v)}</div>
      `;
      tooltip.style.left = `${e.clientX + 12}px`;
      tooltip.style.top = `${e.clientY + 12}px`;
      canvas.style.cursor = "pointer";
    } else {
      tooltip.style.opacity = "0";
      canvas.style.cursor = "default";
    }
  });

  canvas.addEventListener("mouseleave", () => {
    tooltip.style.opacity = "0";
    canvas.style.cursor = "default";
  });
}

// ---------------- Skills Pie Chart (borrowed from the "graphql-main" idea) ----------------

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function svgEl(tag) {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

function clamp01To100(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

export function mountSkillsChart(skillsNodes, mount) {
  if (!mount) return;

  const skills = Array.isArray(skillsNodes) ? skillsNodes : [];
  mount.innerHTML = "";

  if (skills.length === 0) {
    mount.append(el("p", "muted", "No skills found."));
    return;
  }

  const header = el("div", "skills-header");
  const titleRow = el("div", "skills-titleRow");
  const title = el("h2", "skills-title", "Skills");
  const hint = el("div", "skills-hint", "Click a skill to preview your progress");
  titleRow.append(title, hint);

  const subtitle = el("div", "skills-subtitle", "");
  header.append(titleRow, subtitle);

  const btnWrap = el("div", "skills-buttons");

  // --- Donut chart ---
  const content = el("div", "skills-content");

  const donutCard = el("div", "skills-donutCard");
  const svgWrap = el("div", "skills-svgWrap");

  const svg = svgEl("svg");
  svg.classList.add("skills-donut");
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Skill completion donut chart");

  const defs = svgEl("defs");
  const grad = svgEl("linearGradient");
  grad.setAttribute("id", "skillsGrad");
  grad.setAttribute("x1", "0%");
  grad.setAttribute("y1", "0%");
  grad.setAttribute("x2", "100%");
  grad.setAttribute("y2", "100%");

  const stop1 = svgEl("stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", "var(--skills-accent-1)");
  const stop2 = svgEl("stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", "var(--skills-accent-2)");

  grad.append(stop1, stop2);
  defs.append(grad);
  svg.append(defs);

  const cx = 60, cy = 60, r = 46;
  const CIRC = 2 * Math.PI * r;

  const track = svgEl("circle");
  track.classList.add("skills-track");
  track.setAttribute("cx", String(cx));
  track.setAttribute("cy", String(cy));
  track.setAttribute("r", String(r));

  const progress = svgEl("circle");
  progress.classList.add("skills-progress");
  progress.setAttribute("cx", String(cx));
  progress.setAttribute("cy", String(cy));
  progress.setAttribute("r", String(r));
  progress.setAttribute("stroke-dasharray", String(CIRC));
  progress.setAttribute("stroke-dashoffset", String(CIRC));

  // Center text
  const centerPct = svgEl("text");
  centerPct.classList.add("skills-centerPct");
  centerPct.setAttribute("x", String(cx));
  centerPct.setAttribute("y", String(cy - 2));
  centerPct.setAttribute("text-anchor", "middle");

  const centerLbl = svgEl("text");
  centerLbl.classList.add("skills-centerLbl");
  centerLbl.setAttribute("x", String(cx));
  centerLbl.setAttribute("y", String(cy + 16));
  centerLbl.setAttribute("text-anchor", "middle");

  svg.append(track, progress, centerPct, centerLbl);
  svgWrap.append(svg);

  const legend = el("div", "skills-side");
  const stats = el("div", "skills-stats");

  const statDone = el("div", "skills-statCard");
  const statDoneK = el("div", "skills-statK", "Completed");
  const statDoneV = el("div", "skills-statV", "0%");
  statDone.append(statDoneK, statDoneV);

  const statLeft = el("div", "skills-statCard");
  const statLeftK = el("div", "skills-statK", "Remaining");
  const statLeftV = el("div", "skills-statV", "0%");
  statLeft.append(statLeftK, statLeftV);

  stats.append(statDone, statLeft);


  legend.append(stats);

  donutCard.append(svgWrap, legend);
  content.append(donutCard);

  mount.append(header, btnWrap, content);

  function setActive(skill) {
    const label = (skill?.type || "").replace(/^skill_?/, "") || "skill";
    const done = clamp01To100(skill?.amount);
    const left = 100 - done;

    subtitle.textContent = `${label.toUpperCase()} • ${done}% completed`;
    statDoneV.textContent = `${done}%`;
    statLeftV.textContent = `${left}%`;

    centerPct.textContent = `${done}%`;
    centerLbl.textContent = label;

    // Donut animation
    const offset = CIRC * (1 - done / 100);
    progress.style.strokeDashoffset = String(offset);
  }

  // Render buttons
  const buttons = skills.map((s, idx) => {
    const raw = (s?.type || "");
    const label = raw.replace(/^skill_?/, "") || `skill ${idx + 1}`;
    const done = clamp01To100(s?.amount);

    const b = el("button", "skills-btn", label);
    b.type = "button";
    b.setAttribute("data-pct", String(done));
    b.title = `${label}: ${done}%`;

    b.addEventListener("click", () => {
      btnWrap.querySelectorAll(".skills-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      setActive(s);
    });

    btnWrap.append(b);
    return b;
  });

  // default select first
  buttons[0]?.click();
}