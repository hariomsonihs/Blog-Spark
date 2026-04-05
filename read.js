import { db } from "./firebase-config.js";
import { doc, getDoc, updateDoc, increment, collection, query, where, limit, getDocs, setDoc, addDoc, onSnapshot, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { app } from "./firebase-config.js";
import { escapeHtml, formatDate, initShellNavigation } from "./ui.js";
import { initNotifications } from "./notifications.js";

initShellNavigation();
initNotifications();

const params = new URLSearchParams(location.search);
const type = params.get("type") || "articles";
const id = params.get("id");

const card = document.getElementById("readCard");
const backBtn = document.getElementById("backBtn");
const bookmarkBtn = document.getElementById("bookmarkBtn");
const shareBtn = document.getElementById("shareBtn");
const backToTop = document.getElementById("backToTop");
const progressBar = document.getElementById("readProgress");

// Back button
const backMap = { articles:"articles.html", tips:"tips.html", facts:"facts.html", projects:"projects.html", resources:"resources.html" };
backBtn.href = backMap[type] || "articles.html";
backBtn.textContent = "← Back to " + (type.charAt(0).toUpperCase() + type.slice(1));

// ── Reading Progress Bar ──
window.addEventListener("scroll", () => {
  const el = document.documentElement;
  const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
  progressBar.style.width = Math.min(pct, 100) + "%";
  backToTop.classList.toggle("show", el.scrollTop > 300);
});
backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// ── Bookmarks (LocalStorage) ──
const BKEY = "bs_bookmarks";
function getBookmarks() { try { return JSON.parse(localStorage.getItem(BKEY) || "[]"); } catch { return []; } }
function saveBookmarks(arr) { localStorage.setItem(BKEY, JSON.stringify(arr)); }
function isBookmarked() { return getBookmarks().some(b => b.id === id && b.type === type); }

function updateBookmarkBtn() {
  if (isBookmarked()) {
    bookmarkBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:var(--brand-2);stroke:var(--brand-2);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>Saved`;
    bookmarkBtn.classList.add("saved");
  } else {
    bookmarkBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>Save`;
    bookmarkBtn.classList.remove("saved");
  }
}
updateBookmarkBtn();

// Update drawer bookmark count badge
function updateDrawerBmCount() {
  const el = document.getElementById("drawerBmCount");
  if (!el) return;
  const count = getBookmarks().length;
  el.textContent = count;
  el.style.display = count ? "inline" : "none";
}
updateDrawerBmCount();

bookmarkBtn.addEventListener("click", () => {
  const bms = getBookmarks();
  if (isBookmarked()) {
    saveBookmarks(bms.filter(b => !(b.id === id && b.type === type)));
  } else {
    const title = document.querySelector("#readCard h1")?.textContent || "";
    bms.push({ id, type, title, savedAt: Date.now() });
    saveBookmarks(bms);
  }
  updateBookmarkBtn();
  updateDrawerBmCount();
});

// ── Share ──
shareBtn.addEventListener("click", async () => {
  const title = document.querySelector("#readCard h1")?.textContent || document.title;
  const url = location.href;
  if (navigator.share) {
    try { await navigator.share({ title, url }); return; } catch {}
  }
  await navigator.clipboard.writeText(url);
  shareBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M20 6L9 17l-5-5"/></svg>Copied!`;
  setTimeout(() => {
    shareBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Share`;
  }, 2000);
});

// ── Views Counter ──
async function incrementViews() {
  try { await updateDoc(doc(db, type, id), { views: increment(1) }); } catch {}
}

function displayViews(count) {
  document.querySelectorAll(".views-badge").forEach(el => {
    el.textContent = `👁 ${count} views`;
    el.style.display = "inline-flex";
  });
}

// ── Related Content ──
async function loadRelated(category, currentId) {
  if (!category) return;
  try {
    const q = query(collection(db, type), where("category", "==", category), limit(6));
    const snap = await getDocs(q);
    const items = snap.docs.filter(d => d.id !== currentId).slice(0, 5);
    if (!items.length) return;
    const section = document.getElementById("relatedSection");
    const grid = document.getElementById("relatedGrid");
    const dots = document.getElementById("relatedDots");
    const titleField = type === "projects" ? "name" : "title";
    const bannerMap = { articles:"banner-article", tips:"banner-tip", facts:"banner-fact", projects:"banner-project", resources:"banner-resource" };
    const iconMap = { articles:"📄", tips:"💡", facts:"🔍", projects:"🚀", resources:"🔗" };
    grid.innerHTML = items.map(d => {
      const data = d.data();
      return `<a class="content-card" href="read.html?type=${type}&id=${d.id}">
        <div class="card-banner ${bannerMap[type] || 'banner-article'}">
          <span class="card-banner-icon">${iconMap[type] || "📄"}</span>
          <div class="card-banner-shape"></div>
        </div>
        <div class="card-top" style="padding:.75rem 1rem 0">
          <div class="badge-row"><span class="badge">${escapeHtml(data.category || "")}</span></div>
          <h3 style="font-size:.9rem;margin:0 0 .4rem;line-height:1.3">${escapeHtml(data[titleField] || data.title || "")}</h3>
        </div>
      </a>`;
    }).join("");

    // Dots
    dots.innerHTML = items.map((_, i) => `<button class="related-dot${i===0?' active':''}" data-i="${i}"></button>`).join("");
    dots.querySelectorAll(".related-dot").forEach(dot => {
      dot.addEventListener("click", () => {
        const card = grid.children[+dot.dataset.i];
        if (card) grid.scrollTo({ left: card.offsetLeft - grid.offsetLeft, behavior: "smooth" });
      });
    });
    grid.addEventListener("scroll", () => {
      const idx = Math.round(grid.scrollLeft / (grid.children[0]?.offsetWidth + 12));
      dots.querySelectorAll(".related-dot").forEach((d, i) => d.classList.toggle("active", i === idx));
    }, { passive: true });

    section.style.display = "block";
  } catch {}
}

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
      <span class="views-badge" style="display:none"></span>
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
      <span class="views-badge" style="display:none"></span>
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
      <span class="views-badge" style="display:none"></span>
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
      <span class="views-badge" style="display:none"></span>
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
      <span class="views-badge" style="display:none"></span>
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
    // Save to reading history
    try {
      const HKEY = "bs_history";
      const hist = JSON.parse(localStorage.getItem(HKEY) || "[]");
      const titleField = type === "projects" ? (data.name || data.title || "Untitled") : (data.title || "Untitled");
      const existing = hist.findIndex(h => h.id === id && h.type === type);
      const entry = { id, type, title: titleField, category: data.category || "", readAt: Date.now() };
      if (existing !== -1) hist.splice(existing, 1);
      hist.unshift(entry);
      localStorage.setItem(HKEY, JSON.stringify(hist.slice(0, 100)));
    } catch {}
    // Show views as current + 1 (this visit counts)
    const currentViews = (data.views || 0) + 1;
    data._displayViews = currentViews;
    switch (type) {
      case "articles":  renderArticle(data);  break;
      case "tips":      renderTip(data);      break;
      case "facts":     renderFact(data);     break;
      case "projects":  renderProject(data);  break;
      case "resources": renderResource(data); break;
      default:          renderError("Unknown content type.");
    }
    // Always show views badge (even if 1st view)
    displayViews(currentViews);
    incrementViews();
    loadRelated(data.category, id);
    initEngagement();

    // Record in user history if logged in
    const auth = getAuth(app);
    onAuthStateChanged(auth, async user => {
      if (!user) return;
      const titleField = type === "projects" ? data.name : data.title;
      try {
        await setDoc(doc(db, "users", user.uid, "history", id), {
          contentId: id, type, title: titleField || "",
          category: data.category || "",
          viewedAt: new Date(),
        });
      } catch {}
    }, { once: true });
  } catch (e) {
    renderError("Failed to load content: " + e.message);
  }
}

load();

// ── Reactions + Comments ──
function initEngagement() {
  document.getElementById("engageSection").style.display = "block";

  // ── Realtime reactions listener ──
  const REACT_KEY = `bs_reacted_${type}_${id}`;
  const myReaction = localStorage.getItem(REACT_KEY);
  if (myReaction) document.querySelector(`.react-btn[data-key="${myReaction}"]`)?.classList.add("reacted");

  // Listen to doc changes for realtime reaction counts
  onSnapshot(doc(db, type, id), snap => {
    const r = snap.data()?.reactions || {};
    ["like","love","fire","mind","clap"].forEach(k => {
      const el = document.getElementById(`react_${k}`);
      if (el) el.textContent = r[k] || 0;
    });
  });

  document.querySelectorAll(".react-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.key;
      const prev = localStorage.getItem(REACT_KEY);
      if (prev === key) {
        // Toggle off
        await updateDoc(doc(db, type, id), { [`reactions.${key}`]: increment(-1) });
        localStorage.removeItem(REACT_KEY);
        btn.classList.remove("reacted");
        return;
      }
      if (prev) {
        await updateDoc(doc(db, type, id), { [`reactions.${prev}`]: increment(-1) });
        document.querySelector(`.react-btn[data-key="${prev}"]`)?.classList.remove("reacted");
      }
      await updateDoc(doc(db, type, id), { [`reactions.${key}`]: increment(1) });
      localStorage.setItem(REACT_KEY, key);
      btn.classList.add("reacted");
    });
  });

  // ── Realtime comments ──
  listenComments();

  // Submit comment
  document.getElementById("submitComment").addEventListener("click", async () => {
    const text = document.getElementById("commentText").value.trim();
    const name = document.getElementById("commentName").value.trim() || "Anonymous";
    if (!text) { document.getElementById("commentText").focus(); return; }
    const btn = document.getElementById("submitComment");
    btn.disabled = true; btn.textContent = "Posting...";
    try {
      await addDoc(collection(db, type, id, "comments"), {
        name, text,
        contentTitle: document.querySelector("#readCard h1")?.textContent || "",
        contentType: type,
        contentId: id,
        createdAt: serverTimestamp()
      });
      document.getElementById("commentText").value = "";
      document.getElementById("commentName").value = "";
    } catch { alert("Failed to post comment."); }
    finally { btn.disabled = false; btn.textContent = "Post Comment"; }
  });
}

function listenComments() {
  const list = document.getElementById("commentsList");
  const countEl = document.getElementById("commentCount");
  const q = query(collection(db, type, id, "comments"), orderBy("createdAt", "asc"));
  onSnapshot(q, snap => {
    // Update comment count header
    if (countEl) countEl.textContent = snap.size ? `${snap.size} comment${snap.size !== 1 ? "s" : ""}` : "";
    if (!snap.size) {
      list.innerHTML = `<div style="font-size:.85rem;color:var(--muted);padding:.5rem 0">No comments yet. Be the first!</div>`;
      return;
    }
    list.innerHTML = snap.docs.map(d => {
      const c = d.data();
      const initials = (c.name || "A").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      const time = c.createdAt?.toDate
        ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(c.createdAt.toDate())
        : "Just now";
      return `<div class="comment-item" data-id="${d.id}">
        <div class="comment-avatar">${escapeHtml(initials)}</div>
        <div class="comment-body">
          <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
            <span class="comment-name">${escapeHtml(c.name || "Anonymous")}</span>
            <span class="comment-time">${time}</span>
          </div>
          <div class="comment-text">${escapeHtml(c.text || "")}</div>
        </div>
      </div>`;
    }).join("");
  });
}

// Feedback modal
const feedbackOverlay = document.getElementById("feedbackOverlay");
const feedbackBtn = document.getElementById("feedbackBtn");
const feedbackClose = document.getElementById("feedbackClose");
const feedbackCancel = document.getElementById("feedbackCancel");
const feedbackSend = document.getElementById("feedbackSend");

function openFeedback() {
  feedbackOverlay.style.display = "flex";
  document.getElementById("feedbackText").focus();
}
function closeFeedback() {
  feedbackOverlay.style.display = "none";
  document.getElementById("feedbackText").value = "";
  document.getElementById("feedbackType").value = "";
}

feedbackBtn?.addEventListener("click", openFeedback);
feedbackClose?.addEventListener("click", closeFeedback);
feedbackCancel?.addEventListener("click", closeFeedback);
feedbackOverlay?.addEventListener("click", e => { if (e.target === feedbackOverlay) closeFeedback(); });

feedbackSend?.addEventListener("click", () => {
  const type = document.getElementById("feedbackType").value;
  const text = document.getElementById("feedbackText").value.trim();
  if (!text) { document.getElementById("feedbackText").focus(); return; }
  const title = document.querySelector("#readCard h1")?.textContent || document.title;
  const pageUrl = location.href;
  const typeLabel = type ? `\nType: ${type}` : "";
  const msg = encodeURIComponent(`📝 Feedback on: "${title}"${typeLabel}\n🔗 ${pageUrl}\n\n${text}`);
  window.open(`https://wa.me/917667110195?text=${msg}`, "_blank", "noopener");
  closeFeedback();
});
