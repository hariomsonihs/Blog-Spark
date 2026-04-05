import { db } from "./firebase-config.js";
import {
  collection, onSnapshot, query, orderBy, limit, getDocs, where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, initRevealAnimations, initShellNavigation } from "./ui.js";
import { initNotifications } from "./notifications.js";

initShellNavigation();
initRevealAnimations();
initNotifications();

// ── Counters ──
const counters = { articles:"countArticles", tips:"countTips", facts:"countFacts", projects:"countProjects", resources:"countResources" };
Object.keys(counters).forEach(col => {
  onSnapshot(collection(db, col), snap => {
    const el = document.getElementById(counters[col]);
    if (el) el.textContent = snap.size;
  });
});

// ── Typing animation ──
const words = ["live content updates.", "in-depth articles.", "quick tips & tricks.", "hands-on projects.", "fascinating facts.", "curated resources."];
let wi = 0, ci = 0, deleting = false;
const typingEl = document.getElementById("typingText");
function type() {
  if (!typingEl) return;
  const word = words[wi];
  typingEl.textContent = deleting ? word.slice(0, ci--) : word.slice(0, ci++);
  if (!deleting && ci > word.length)      { deleting = true; setTimeout(type, 1400); return; }
  if (deleting && ci < 0)                 { deleting = false; wi = (wi + 1) % words.length; ci = 0; }
  setTimeout(type, deleting ? 45 : 80);
}
type();

// ── Helpers ──
function stripHtml(html) { return (html||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(); }
function preview(text, len=150) { const p=stripHtml(text); return p.length>len?p.slice(0,len).trimEnd()+"…":p; }
function renderState(el, text) { if(el) el.innerHTML=`<div class="state-box" style="grid-column:1/-1">${escapeHtml(text)}</div>`; }
function banner(cls, icon, imageUrl) {
  if (imageUrl) return `<div class="card-banner card-banner-img"><img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.classList.remove('card-banner-img');this.remove()"/></div>`;
  return `<div class="card-banner ${cls}"><span class="card-banner-icon">${icon}</span><div class="card-banner-shape"></div><div class="card-banner-shape2"></div></div>`;
}

// ── Featured Banner ──
async function loadFeatured() {
  const types = ["articles","tips","facts","projects","resources"];
  for (const t of types) {
    const q = query(collection(db, t), where("featured", "==", true), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0].data();
      const id = snap.docs[0].id;
      const title = d.title || d.name || "Featured";
      const desc  = preview(d.description || d.body || d.content || "", 180);
      document.getElementById("featuredTitle").textContent = title;
      document.getElementById("featuredDesc").textContent  = desc;
      document.getElementById("featuredLink").href = `read.html?type=${t}&id=${id}`;
      document.getElementById("featuredBanner").classList.add("show");
      return;
    }
  }
}
loadFeatured();

// ── Trending ──
async function loadTrending() {
  const list = document.getElementById("trendingList");
  const types = ["articles","tips","facts","projects","resources"];
  const typeIcon = { articles:"📄", tips:"💡", facts:"🔍", projects:"🚀", resources:"🔗" };
  let all = [];
  await Promise.all(types.map(async t => {
    const q = query(collection(db, t), orderBy("views","desc"), limit(4));
    try {
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        const data = d.data();
        if ((data.views||0) > 0) all.push({ id:d.id, type:t, title:data.title||data.name||"Untitled", views:data.views||0, category:data.category||"" });
      });
    } catch {}
  }));
  all.sort((a,b) => b.views - a.views);
  const top = all.slice(0, 6);
  if (!top.length) { list.innerHTML = `<div class="state-box">No trending content yet — views will appear here.</div>`; return; }
  list.innerHTML = top.map((item, i) => `
    <a class="trending-item" href="read.html?type=${item.type}&id=${item.id}">
      <span class="trending-rank">#${i+1}</span>
      <div class="trending-info">
        <div class="trending-title">${escapeHtml(item.title)}</div>
        <div class="trending-meta">${typeIcon[item.type]} ${item.type} ${item.category ? "· "+escapeHtml(item.category) : ""}</div>
      </div>
      <span class="trending-views">👁 ${item.views}</span>
    </a>`).join("");
}
loadTrending();

// ── Swiper ──
function initSwiper(trackId, dotsId) {
  if (window.innerWidth > 760) return;
  const track = document.getElementById(trackId);
  const dotsEl = document.getElementById(dotsId);
  if (!track || !dotsEl) return;
  const cards = Array.from(track.children);
  if (cards.length <= 1) { dotsEl.style.display="none"; return; }
  dotsEl.innerHTML = cards.map((_,i) => `<span class="swiper-dot${i===0?" active":""}" data-idx="${i}"></span>`).join("");
  const dots = dotsEl.querySelectorAll(".swiper-dot");
  dotsEl.addEventListener("click", e => {
    const dot = e.target.closest(".swiper-dot"); if(!dot) return;
    cards[+dot.dataset.idx].scrollIntoView({behavior:"smooth",block:"nearest",inline:"start"});
    dots.forEach((d,j) => d.classList.toggle("active", j===+dot.dataset.idx));
  });
  let t;
  track.addEventListener("scroll", () => {
    clearTimeout(t); t = setTimeout(() => {
      let closest=0, minDist=Infinity;
      cards.forEach((c,i) => { const dist=Math.abs(c.offsetLeft-track.scrollLeft); if(dist<minDist){minDist=dist;closest=i;} });
      dots.forEach((d,j) => d.classList.toggle("active", j===closest));
    }, 60);
  });
}

function watchLatest(col, listId, lim, renderer, dotsId) {
  const container = document.getElementById(listId); if(!container) return;
  const q = query(collection(db, col), orderBy("createdAt","desc"), limit(lim));
  onSnapshot(q, snap => {
    if (snap.empty) { renderState(container, `No ${col} yet.`); return; }
    container.innerHTML = snap.docs.map(d => renderer(d.id, d.data())).join("");
    initSwiper(listId, dotsId);
  }, err => renderState(container, `Unable to load ${col}: ${err.message}`));
}

watchLatest("articles","latestArticles",3,(id,d) => `
  <a class="content-card" href="read.html?type=articles&id=${encodeURIComponent(id)}">
    ${banner("banner-article","📄")}
    <div class="card-top">
      <div class="badge-row"><span class="badge">${escapeHtml(d.category||"Article")}</span>${d.readTime?`<span class="badge badge-muted">⏱ ${escapeHtml(d.readTime)}</span>`:""}</div>
      <h3>${escapeHtml(d.title||"Untitled")}</h3>
      <p class="card-desc">${escapeHtml(preview(d.description||d.content||""))}</p>
    </div>
    <div class="card-bottom"><div class="card-actions"><span class="small-btn">Read more →</span></div></div>
  </a>`, "dotArticles");

watchLatest("tips","latestTips",4,(id,d) => `
  <a class="content-card" href="read.html?type=tips&id=${encodeURIComponent(id)}">
    ${banner("banner-tip","💡")}
    <div class="card-top">
      <div class="badge-row"><span class="badge badge-green">Tip</span>${d.category?`<span class="badge">${escapeHtml(d.category)}</span>`:""}</div>
      <h3>${escapeHtml(d.title||"Tip")}</h3>
      <p class="card-desc">${escapeHtml(preview(d.body||""))}</p>
    </div>
    <div class="card-bottom"><div class="card-actions"><span class="small-btn">Read more →</span></div></div>
  </a>`, "dotTips");

watchLatest("facts","latestFacts",4,(id,d) => `
  <a class="content-card" href="read.html?type=facts&id=${encodeURIComponent(id)}">
    ${banner("banner-fact","🔍")}
    <div class="card-top">
      <div class="badge-row"><span class="badge badge-orange">Fact</span>${d.category?`<span class="badge">${escapeHtml(d.category)}</span>`:""}</div>
      <h3>${escapeHtml(d.title||"Fact")}</h3>
      <p class="card-desc">${escapeHtml(preview(d.body||""))}</p>
    </div>
    <div class="card-bottom"><div class="card-actions"><span class="small-btn">Read more →</span></div></div>
  </a>`, "dotFacts");

watchLatest("projects","latestProjects",3,(id,d) => `
  <a class="content-card" href="read.html?type=projects&id=${encodeURIComponent(id)}">
    ${banner("banner-project","🚀",d.imageUrl)}
    <div class="card-top">
      <div class="badge-row">${d.level?`<span class="badge badge-purple">${escapeHtml(d.level)}</span>`:""}${d.stack?`<span class="badge">🛠 ${escapeHtml(d.stack)}</span>`:""}</div>
      <h3>${escapeHtml(d.name||"Untitled Project")}</h3>
      <p class="card-desc">${escapeHtml(preview(d.description||""))}</p>
    </div>
    <div class="card-bottom"><div class="card-actions"><span class="small-btn">View details →</span>${d.liveUrl?`<a class="small-btn small-btn-ghost" href="${escapeHtml(d.liveUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Live ↗</a>`:""}</div></div>
  </a>`, "dotProjects");
