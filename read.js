import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, formatDate, initShellNavigation } from "./ui.js";

initShellNavigation();

const params = new URLSearchParams(location.search);
const type = params.get("type") || "articles";
const id = params.get("id");

const card = document.getElementById("readCard");
const backBtn = document.getElementById("backBtn");

// Set back button href based on type
const backMap = {
  articles: "articles.html",
  tips: "tips.html",
  facts: "facts.html",
  projects: "projects.html",
  resources: "resources.html",
};
backBtn.href = backMap[type] || "articles.html";
backBtn.textContent = "← Back to " + (type.charAt(0).toUpperCase() + type.slice(1));

function esc(t){return String(t??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");}

function plainToHtml(text) {
  if (!text) return "";
  // Agar already HTML hai toh as-is return karo
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  // Plain text ko HTML paragraphs mein convert karo
  return text
    .split(/\n\n+/)
    .map(para => {
      const lines = para.split("\n").map(l => l.trimEnd());
      // Bullet list detect karo
      if (lines.every(l => /^[-•*]\s/.test(l) || l === "")) {
        const items = lines.filter(l => l).map(l => `<li>${esc(l.replace(/^[-•*]\s/, ""))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      // Numbered list detect karo
      if (lines.every(l => /^\d+\.\s/.test(l) || l === "")) {
        const items = lines.filter(l => l).map(l => `<li>${esc(l.replace(/^\d+\.\s/, ""))}</li>`).join("");
        return `<ol>${items}</ol>`;
      }
      // Normal paragraph — newlines ko <br> mein
      return `<p>${lines.map(l => esc(l)).join("<br>")}</p>`;
    })
    .join("");
}

function renderArticle(data) {
  const tags = data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
  card.innerHTML = `
    <div class="badge-row">
      ${data.category ? `<span class="badge">${esc(data.category)}</span>` : ""}
      ${data.readTime ? `<span class="badge">⏱ ${esc(data.readTime)}</span>` : ""}
    </div>
    <h1>${esc(data.title)}</h1>
    <div class="read-meta">
      ${data.createdAt ? `<span>📅 ${formatDate(data.createdAt)}</span>` : ""}
      ${data.readTime ? `<span>⏱ ${esc(data.readTime)}</span>` : ""}
    </div>
    <div class="read-body ql-editor" id="readBodyHtml"></div>
    ${tags.length ? `<div class="read-tags">${tags.map(t => `<span class="badge">${esc(t)}</span>`).join("")}</div>` : ""}
  `;
  document.title = `BlogSpark | ${data.title}`;
  const bodyEl = document.getElementById("readBodyHtml");
  if (bodyEl) bodyEl.innerHTML = plainToHtml(data.content || data.description || "");
}

function renderTip(data) {
  card.innerHTML = `
    <div class="badge-row">
      ${data.category ? `<span class="badge">${esc(data.category)}</span>` : ""}
      <span class="badge">💡 Tip</span>
    </div>
    <h1>${esc(data.title)}</h1>
    <div class="read-meta">
      ${data.createdAt ? `<span>📅 ${formatDate(data.createdAt)}</span>` : ""}
    </div>
    <div class="read-body ql-editor" id="tipBodyHtml"></div>
    ${data.example ? `
      <div style="margin-top:1.4rem">
        <p style="font-weight:600;margin:0 0 .5rem;color:var(--text)">Code Example</p>
        <pre style="background:rgba(221,235,255,0.6);border:1px solid var(--line);border-radius:14px;padding:1rem;overflow:auto;font-size:.88rem;color:#1a355f;line-height:1.5">${esc(data.example)}</pre>
      </div>` : ""}
    ${data.tags ? `<div class="read-tags">${data.tags.split(",").map(t=>`<span class="badge">${esc(t.trim())}</span>`).join("")}</div>` : ""}
  `;
  document.title = `BlogSpark | ${data.title}`;
  const tipEl = document.getElementById("tipBodyHtml");
  if (tipEl) tipEl.innerHTML = plainToHtml(data.body || "");
}

function renderFact(data) {
  card.innerHTML = `
    <div class="badge-row">
      ${data.category ? `<span class="badge">${esc(data.category)}</span>` : ""}
      <span class="badge">🔍 Fact</span>
    </div>
    <h1>${esc(data.title)}</h1>
    <div class="read-meta">
      ${data.createdAt ? `<span>📅 ${formatDate(data.createdAt)}</span>` : ""}
      ${data.source ? `<span>🔗 <a href="${esc(data.source)}" target="_blank" rel="noopener" style="color:var(--brand-2)">Source</a></span>` : ""}
    </div>
    <div class="read-body">${esc(data.body || "")}</div>
  `;
  document.title = `BlogSpark | ${data.title}`;
}

function renderProject(data) {
  // Support old single `code` field + new `codeFiles` array
  const files = (data.codeFiles && data.codeFiles.length)
    ? data.codeFiles
    : (data.code ? [{ name: "source.js", code: data.code }] : []);

  const linksHtml = [
    data.liveUrl   ? `<a class="proj-link-btn proj-live" href="${esc(data.liveUrl)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>Live Demo</a>` : "",
    data.repoUrl   ? `<a class="proj-link-btn proj-github" href="${esc(data.repoUrl)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>GitHub</a>` : "",
    data.outputUrl ? `<a class="proj-link-btn proj-output" href="${esc(data.outputUrl)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>Output</a>` : "",
  ].filter(Boolean).join("");

  const codeSection = files.length ? `
    <div class="proj-code-wrap">
      <div class="proj-tabs" id="projTabs">
        ${files.map((f, i) => `<button class="proj-tab${i === 0 ? " active" : ""}" data-idx="${i}">${esc(f.name)}</button>`).join("")}
      </div>
      <div class="proj-code-panels">
        ${files.map((f, i) => `
          <div class="proj-panel${i === 0 ? " active" : ""}" data-idx="${i}">
            <div class="proj-code-bar">
              <span class="proj-code-filename">${esc(f.name)}</span>
              <button class="proj-copy-btn" data-idx="${i}">Copy</button>
              <button class="proj-dl-btn" data-idx="${i}">⬇ Download</button>
            </div>
            <pre class="proj-pre"><code>${esc(f.code)}</code></pre>
          </div>`).join("")}
      </div>
    </div>` : "";

  card.innerHTML = `
    <div class="badge-row">
      ${data.category ? `<span class="badge badge-pink">${esc(data.category)}</span>` : ""}
      ${data.level ? `<span class="badge">${esc(data.level)}</span>` : ""}
      ${data.stack ? `<span class="badge">🛠 ${esc(data.stack)}</span>` : ""}
    </div>
    <h1>${esc(data.name)}</h1>
    <div class="read-meta">
      ${data.createdAt ? `<span>📅 ${formatDate(data.createdAt)}</span>` : ""}
    </div>
    ${linksHtml ? `<div class="proj-links">${linksHtml}</div>` : ""}
    <div class="proj-section-label">About this project</div>
    <div class="read-body ql-editor" id="projDescBody"></div>
    ${codeSection}
  `;
  document.title = `BlogSpark | ${data.name}`;

  // Set description HTML safely
  const descEl = document.getElementById("projDescBody");
  if (descEl) descEl.innerHTML = plainToHtml(data.description || "");

  // Tab switching
  const tabsEl = document.getElementById("projTabs");
  tabsEl?.addEventListener("click", e => {
    const btn = e.target.closest(".proj-tab");
    if (!btn) return;
    const idx = btn.dataset.idx;
    tabsEl.querySelectorAll(".proj-tab").forEach(t => t.classList.toggle("active", t.dataset.idx === idx));
    card.querySelectorAll(".proj-panel").forEach(p => p.classList.toggle("active", p.dataset.idx === idx));
  });

  // Copy buttons
  card.querySelectorAll(".proj-copy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const code = files[+btn.dataset.idx]?.code || "";
      navigator.clipboard.writeText(code).then(() => { btn.textContent = "Copied!"; setTimeout(() => btn.textContent = "Copy", 2000); });
    });
  });

  // Download buttons
  card.querySelectorAll(".proj-dl-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const f = files[+btn.dataset.idx];
      if (!f) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([f.code], { type: "text/plain" }));
      a.download = f.name;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  });
}

function renderResource(data) {
  card.innerHTML = `
    <div class="badge-row">
      ${data.type ? `<span class="badge">${esc(data.type)}</span>` : ""}
      ${data.category ? `<span class="badge">${esc(data.category)}</span>` : ""}
    </div>
    <h1>${esc(data.title)}</h1>
    <div class="read-meta">
      ${data.createdAt ? `<span>📅 ${formatDate(data.createdAt)}</span>` : ""}
      ${data.url ? `<a href="${esc(data.url)}" target="_blank" rel="noopener" style="color:var(--brand-2)">🔗 Open Resource</a>` : ""}
    </div>
    <div class="read-body">${esc(data.description || "")}</div>
    ${data.tags ? `<div class="read-tags">${data.tags.split(",").map(t=>`<span class="badge">${esc(t.trim())}</span>`).join("")}</div>` : ""}
  `;
  document.title = `BlogSpark | ${data.title}`;
}

function renderError(msg) {
  card.innerHTML = `
    <div class="read-error">
      <h2>Oops!</h2>
      <p>${msg}</p>
      <a href="${backBtn.href}" class="read-back" style="margin-top:1rem;display:inline-flex">← Go Back</a>
    </div>
  `;
}

async function load() {
  if (!id) { renderError("No article ID found in URL."); return; }

  try {
    const snap = await getDoc(doc(db, type, id));
    if (!snap.exists()) { renderError("This content was not found or may have been deleted."); return; }

    const data = snap.data();
    switch (type) {
      case "articles":  renderArticle(data);  break;
      case "tips":      renderTip(data);      break;
      case "facts":     renderFact(data);     break;
      case "projects":  renderProject(data);  break;
      case "resources": renderResource(data); break;
      default:          renderError("Unknown content type.");
    }
  } catch (e) {
    renderError("Failed to load content: " + e.message);
  }
}

load();

// Bottom nav + mobile
const drawer = document.getElementById("sideDrawer");
const overlay = document.getElementById("drawerOverlay");
document.getElementById("openDrawer")?.addEventListener("click", () => { drawer.classList.add("open"); overlay.classList.add("show"); });
["closeDrawer","drawerOverlay"].forEach(id => {
  document.getElementById(id)?.addEventListener("click", () => { drawer.classList.remove("open"); overlay.classList.remove("show"); });
});
