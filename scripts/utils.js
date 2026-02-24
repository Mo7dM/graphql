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