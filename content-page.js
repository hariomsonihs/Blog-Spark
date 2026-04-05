import { db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, initRevealAnimations, initShellNavigation } from "./ui.js";
import { initNotifications } from "./notifications.js";

const main = document.querySelector("main[data-collection]");
if (!main) {
  throw new Error("Missing page dataset for collection.");
}

const collectionName = main.dataset.collection;
const kind = main.dataset.kind;

const grid = document.getElementById("contentGrid");
const liveStatus = document.getElementById("liveStatus");
const errorBox = document.getElementById("errorBox");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

const codeModal = document.getElementById("codeModal");
const modalTitle = document.getElementById("modalTitle");
const modalCode = document.getElementById("modalCode");
const closeModalBtn = document.getElementById("closeModal");

let allDocs = [];
let activeCategory = "All";

const categoryChips = document.getElementById("categoryChips");

function buildCategoryChips() {
  if (!categoryChips) return;
  const cats = ["All", ...new Set(allDocs.map(d => d.category).filter(Boolean))];
  categoryChips.innerHTML = cats.map(c =>
    `<button class="filter-chip${c === activeCategory ? " active" : ""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join("");
  categoryChips.querySelectorAll(".filter-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      buildCategoryChips();
      render();
    });
  });
}

// HTML tags strip karke plain text preview banao (cards ke liye)
function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// 150 chars tak truncate karo
function preview(text, len = 150) {
  const plain = stripHtml(text);
  return plain.length > len ? plain.slice(0, len).trimEnd() + "…" : plain;
}

function renderState(text) {
  grid.innerHTML = `<div class="state-box" style="grid-column:1/-1">${escapeHtml(text)}</div>`;
}

function banner(cls, icon, imageUrl) {
  if (imageUrl) {
    return `<div class="card-banner card-banner-img"><img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.classList.remove('card-banner-img');this.remove()"/></div>`;
  }
  return `<div class="card-banner ${cls}"><span class="card-banner-icon">${icon}</span><div class="card-banner-shape"></div><div class="card-banner-shape2"></div></div>`;
}

function cardForArticles(item) {
  const tags = item.tags ? item.tags.split(",").map(t => `<span class="card-tag">${escapeHtml(t.trim())}</span>`).join("") : "";
  return `
    <a class="content-card" href="read.html?type=articles&id=${item.id}">
      ${banner("banner-article", "📄")}
      <div class="card-top">
        <div class="badge-row">
          <span class="badge">${escapeHtml(item.category || "Article")}</span>
          ${item.readTime ? `<span class="badge badge-muted">⏱ ${escapeHtml(item.readTime)}</span>` : ""}
          ${item.views ? `<span class="badge badge-muted">👁 ${item.views}</span>` : ""}
        </div>
        <h3>${escapeHtml(item.title || "Untitled")}</h3>
        <p class="card-desc">${escapeHtml(preview(item.description || item.content || ""))}</p>
      </div>
      <div class="card-bottom">
        ${tags ? `<div class="card-tags">${tags}</div>` : ""}
        <div class="card-actions">
          <span class="small-btn">Read more →</span>
        </div>
      </div>
    </a>
  `;
}

function cardForTips(item) {
  const tags = item.tags ? item.tags.split(",").map(t => `<span class="card-tag">${escapeHtml(t.trim())}</span>`).join("") : "";
  return `
    <a class="content-card" href="read.html?type=tips&id=${item.id}">
      ${banner("banner-tip", "💡")}
      <div class="card-top">
        <div class="badge-row">
          <span class="badge badge-green">Tip</span>
          ${item.category ? `<span class="badge">${escapeHtml(item.category)}</span>` : ""}
        </div>
        <h3>${escapeHtml(item.title || "Tip")}</h3>
        <p class="card-desc">${escapeHtml(preview(item.body || ""))}</p>
      </div>
      <div class="card-bottom">
        ${item.example ? `<div class="card-code-preview"><code>${escapeHtml(item.example.slice(0, 80))}${item.example.length > 80 ? "…" : ""}</code></div>` : ""}
        ${tags ? `<div class="card-tags">${tags}</div>` : ""}
        <div class="card-actions">
          <span class="small-btn">Read more →</span>
        </div>
      </div>
    </a>
  `;
}

function cardForFacts(item) {
  const cat = item.category ? `<span class="badge">${escapeHtml(item.category)}</span>` : "";
  const src = item.source
    ? `<span class="small-btn small-btn-ghost" data-src="${escapeHtml(item.source)}">Source ↗</span>`
    : "";
  return `
    <a class="content-card fact-card" href="read.html?type=facts&id=${item.id}">
      ${banner("banner-fact", "🔍")}
      <div class="card-top">
        <div class="badge-row">
          <span class="badge badge-orange">Fact</span>${cat}
        </div>
        <h3>${escapeHtml(item.title || "Fact")}</h3>
        <p class="card-desc">${escapeHtml(preview(item.body || ""))}</p>
      </div>
      <div class="card-bottom">
        <div class="card-actions">
          <span class="small-btn">Read more →</span>${src}
        </div>
      </div>
    </a>
  `;
}

function cardForProjects(item) {
  const fileCount = item.codeFiles?.length || (item.code ? 1 : 0);
  const live = item.liveUrl ? `<span class="small-btn small-btn-ghost" data-src="${escapeHtml(item.liveUrl)}">Live ↗</span>` : "";
  const repo = item.repoUrl ? `<span class="small-btn small-btn-ghost" data-src="${escapeHtml(item.repoUrl)}">GitHub ↗</span>` : "";
  return `
    <a class="content-card" href="read.html?type=projects&id=${item.id}">
      ${banner("banner-project", "🚀", item.imageUrl)}
      <div class="card-top">
        <div class="badge-row">
          ${item.category ? `<span class="badge badge-pink">${escapeHtml(item.category)}</span>` : ""}
          ${item.level ? `<span class="badge badge-purple">${escapeHtml(item.level)}</span>` : ""}
          ${item.stack ? `<span class="badge">🛠 ${escapeHtml(item.stack)}</span>` : ""}
          ${fileCount ? `<span class="badge badge-muted">📄 ${fileCount} file${fileCount > 1 ? "s" : ""}</span>` : ""}
        </div>
        <h3>${escapeHtml(item.name || "Untitled Project")}</h3>
        <p class="card-desc">${escapeHtml(preview(item.description || ""))}</p>
      </div>
      <div class="card-bottom">
        <div class="card-actions">
          <span class="small-btn">View &amp; Code →</span>${live}${repo}
        </div>
      </div>
    </a>
  `;
}

function cardForResources(item) {
  const tags = item.tags ? item.tags.split(",").map(t => `<span class="card-tag">${escapeHtml(t.trim())}</span>`).join("") : "";
  return `
    <a class="content-card" href="${item.url ? escapeHtml(item.url) : '#'}" ${item.url ? 'target="_blank" rel="noopener"' : ''}>
      ${banner("banner-resource", "🔗")}
      <div class="card-top">
        <div class="badge-row">
          ${item.type ? `<span class="badge badge-pink">${escapeHtml(item.type)}</span>` : ""}
          ${item.category ? `<span class="badge">${escapeHtml(item.category)}</span>` : ""}
        </div>
        <h3>${escapeHtml(item.title || "Resource")}</h3>
        <p class="card-desc">${escapeHtml(preview(item.description || ""))}</p>
      </div>
      <div class="card-bottom">
        ${tags ? `<div class="card-tags">${tags}</div>` : ""}
        <div class="card-actions">
          <span class="small-btn">Open link ↗</span>
        </div>
      </div>
    </a>
  `;
}

function renderCard(item) {
  switch (kind) {
    case "articles":
      return cardForArticles(item);
    case "tips":
      return cardForTips(item);
    case "facts":
      return cardForFacts(item);
    case "projects":
      return cardForProjects(item);
    case "resources":
      return cardForResources(item);
    default:
      return "";
  }
}

const PAGE_SIZE = 9;
let page = 1;

function getFilteredDocs() {
  const queryText = (searchInput?.value || "").trim().toLowerCase();
  const sortBy = sortSelect?.value || "newest";

  let docs = allDocs.filter((item) => {
    const matchSearch = !queryText || Object.values(item).map(v => String(v ?? "")).join(" ").toLowerCase().includes(queryText);
    const matchCat = activeCategory === "All" || item.category === activeCategory;
    return matchSearch && matchCat;
  });

  if (sortBy === "oldest") docs = [...docs].reverse();
  return docs;
}

function render() {
  const docs = getFilteredDocs();
  if (!docs.length) {
    renderState(searchInput?.value ? "No matching result found." : "No content yet. Add from admin panel.");
    document.getElementById("loadMoreWrap")?.remove();
    return;
  }

  const visible = docs.slice(0, page * PAGE_SIZE);
  grid.innerHTML = visible.map((doc) => renderCard(doc)).join("");

  // Load More button
  let wrap = document.getElementById("loadMoreWrap");
  if (visible.length < docs.length) {
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "loadMoreWrap";
      wrap.style.cssText = "text-align:center;margin-top:1.2rem";
      wrap.innerHTML = `<button class="btn soft" id="loadMoreBtn">Load More</button>`;
      grid.parentElement.appendChild(wrap);
      document.getElementById("loadMoreBtn").addEventListener("click", () => { page++; render(); });
    }
  } else {
    wrap?.remove();
  }
}

function bindCodeModal() {
  if (!codeModal) return;

  closeModalBtn?.addEventListener("click", () => codeModal.close());

  codeModal.addEventListener("click", (event) => {
    const modalRect = codeModal.querySelector("article")?.getBoundingClientRect();
    if (!modalRect) return;
    const inside =
      event.clientX >= modalRect.left &&
      event.clientX <= modalRect.right &&
      event.clientY >= modalRect.top &&
      event.clientY <= modalRect.bottom;

    if (!inside) codeModal.close();
  });

  grid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-code]");
    if (!trigger) return;

    const name = trigger.getAttribute("data-name") || "Project";
    const code = decodeURIComponent(trigger.getAttribute("data-code") || "");

    modalTitle.textContent = `${name} source code`;
    modalCode.textContent = code;
    codeModal.showModal();
  });
}

searchInput?.addEventListener("input", () => { page = 1; render(); });
sortSelect?.addEventListener("change", () => { page = 1; render(); });

grid.addEventListener("click", e => {
  const src = e.target.closest("[data-src]");
  if (src) { e.preventDefault(); e.stopPropagation(); window.open(src.dataset.src, "_blank", "noopener"); }
});

const liveQuery = query(collection(db, collectionName), orderBy("createdAt", "desc"));
onSnapshot(
  liveQuery,
  (snapshot) => {
    allDocs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    if (liveStatus) {
      liveStatus.textContent = `Live - ${allDocs.length} item${allDocs.length === 1 ? "" : "s"}`;
    }

    errorBox.innerHTML = "";
    buildCategoryChips();
    render();
  },
  (error) => {
    if (liveStatus) liveStatus.textContent = "Connection error";
    errorBox.innerHTML = `<div class="toast error">Firebase error: ${escapeHtml(error.message)}</div>`;
  }
);

bindCodeModal();
initShellNavigation();
initRevealAnimations();
initNotifications();

// Back to Top
const btt = document.createElement("button");
btt.id = "backToTop"; btt.textContent = "↑"; btt.title = "Back to top";
document.body.appendChild(btt);
window.addEventListener("scroll", () => btt.classList.toggle("show", window.scrollY > 300));
btt.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
