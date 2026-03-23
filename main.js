import { db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, initRevealAnimations, initShellNavigation } from "./ui.js";

const counters = {
  articles: "countArticles",
  tips: "countTips",
  facts: "countFacts",
  projects: "countProjects",
  resources: "countResources",
};

function setCount(collectionName, value) {
  const el = document.getElementById(counters[collectionName]);
  if (el) el.textContent = String(value);
}

Object.keys(counters).forEach((collectionName) => {
  onSnapshot(collection(db, collectionName), (snapshot) => {
    setCount(collectionName, snapshot.size);
  });
});

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function preview(text, len = 150) {
  const plain = stripHtml(text);
  return plain.length > len ? plain.slice(0, len).trimEnd() + "…" : plain;
}

function renderState(container, text) {
  if (!container) return;
  container.innerHTML = `<div class="state-box" style="grid-column:1/-1">${escapeHtml(text)}</div>`;
}

function initSwiper(trackId, dotsId) {
  if (window.innerWidth > 760) return;
  const track = document.getElementById(trackId);
  const dotsEl = document.getElementById(dotsId);
  if (!track || !dotsEl) return;

  const cards = Array.from(track.children);
  if (cards.length <= 1) { dotsEl.style.display = "none"; return; }

  const pages = cards.length;

  // Dots banao
  dotsEl.innerHTML = cards.map((_, i) =>
    `<span class="swiper-dot${i === 0 ? " active" : ""}" data-idx="${i}"></span>`
  ).join("");

  const dots = dotsEl.querySelectorAll(".swiper-dot");

  function setActive(i) {
    dots.forEach((d, j) => d.classList.toggle("active", i === j));
  }

  dotsEl.addEventListener("click", e => {
    const dot = e.target.closest(".swiper-dot");
    if (!dot) return;
    const idx = +dot.dataset.idx;
    cards[idx].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    setActive(idx);
  });

  // Scroll se active dot update
  let t;
  track.addEventListener("scroll", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const scrollLeft = track.scrollLeft;
      let closest = 0, minDist = Infinity;
      cards.forEach((c, i) => {
        const dist = Math.abs(c.offsetLeft - scrollLeft);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      setActive(closest);
    }, 60);
  });
}

function watchLatest(collectionName, listId, limitCount, renderer, dotsId) {
  const container = document.getElementById(listId);
  if (!container) return;

  const q = query(collection(db, collectionName), orderBy("createdAt", "desc"), limit(limitCount));
  onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        renderState(container, `No ${collectionName} yet.`);
        return;
      }

      container.innerHTML = snapshot.docs
        .map((docSnap) => renderer(docSnap.id, docSnap.data()))
        .join("");
      initSwiper(listId, dotsId);
    },
    (error) => {
      renderState(container, `Unable to load ${collectionName}: ${error.message}`);
    }
  );
}

function banner(cls, icon, imageUrl) {
  if (imageUrl) {
    return `<div class="card-banner card-banner-img"><img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.classList.remove('card-banner-img');this.remove()"/></div>`;
  }
  return `<div class="card-banner ${cls}"><span class="card-banner-icon">${icon}</span><div class="card-banner-shape"></div><div class="card-banner-shape2"></div></div>`;
}

watchLatest("articles", "latestArticles", 3, (id, data) => {
  return `
    <a class="content-card" href="read.html?type=articles&id=${encodeURIComponent(id)}">
      ${banner("banner-article", "📄")}
      <div class="card-top">
        <div class="badge-row">
          <span class="badge">${escapeHtml(data.category || "Article")}</span>
          ${data.readTime ? `<span class="badge badge-muted">⏱ ${escapeHtml(data.readTime)}</span>` : ""}
        </div>
        <h3>${escapeHtml(data.title || "Untitled")}</h3>
        <p class="card-desc">${escapeHtml(preview(data.description || data.content || ""))}</p>
      </div>
      <div class="card-bottom">
        <div class="card-actions">
          <span class="small-btn">Read more →</span>
        </div>
      </div>
    </a>
  `;
}, "dotArticles");

watchLatest("tips", "latestTips", 4, (id, data) => {
  return `
    <a class="content-card" href="read.html?type=tips&id=${encodeURIComponent(id)}">
      ${banner("banner-tip", "💡")}
      <div class="card-top">
        <div class="badge-row">
          <span class="badge badge-green">Tip</span>
          ${data.category ? `<span class="badge">${escapeHtml(data.category)}</span>` : ""}
        </div>
        <h3>${escapeHtml(data.title || "Tip")}</h3>
        <p class="card-desc">${escapeHtml(preview(data.body || ""))}</p>
      </div>
      <div class="card-bottom">
        <div class="card-actions">
          <span class="small-btn">Read more →</span>
        </div>
      </div>
    </a>
  `;
}, "dotTips");

watchLatest("facts", "latestFacts", 4, (id, data) => {
  return `
    <a class="content-card" href="read.html?type=facts&id=${encodeURIComponent(id)}">
      ${banner("banner-fact", "🔍")}
      <div class="card-top">
        <div class="badge-row">
          <span class="badge badge-orange">Fact</span>
          ${data.category ? `<span class="badge">${escapeHtml(data.category)}</span>` : ""}
        </div>
        <h3>${escapeHtml(data.title || "Fact")}</h3>
        <p class="card-desc">${escapeHtml(preview(data.body || ""))}</p>
      </div>
      <div class="card-bottom">
        <div class="card-actions">
          <span class="small-btn">Read more →</span>
        </div>
      </div>
    </a>
  `;
}, "dotFacts");

watchLatest("projects", "latestProjects", 3, (id, data) => {
  return `
    <a class="content-card" href="read.html?type=projects&id=${encodeURIComponent(id)}">
      ${banner("banner-project", "🚀", data.imageUrl)}
      <div class="card-top">
        <div class="badge-row">
          ${data.level ? `<span class="badge badge-purple">${escapeHtml(data.level)}</span>` : ""}
          ${data.stack ? `<span class="badge">🛠 ${escapeHtml(data.stack)}</span>` : ""}
        </div>
        <h3>${escapeHtml(data.name || "Untitled Project")}</h3>
        <p class="card-desc">${escapeHtml(preview(data.description || ""))}</p>
      </div>
      <div class="card-bottom">
        <div class="card-actions">
          <span class="small-btn">View details →</span>
          ${data.liveUrl ? `<a class="small-btn small-btn-ghost" href="${escapeHtml(data.liveUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Live ↗</a>` : ""}
        </div>
      </div>
    </a>
  `;
}, "dotProjects");

initShellNavigation();
initRevealAnimations();
