import { app, db } from "./firebase-config.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  doc, setDoc, getDoc, updateDoc, collection, query, orderBy,
  limit, getDocs, serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { initShellNavigation, formatDate, escapeHtml, initRevealAnimations } from "./ui.js";
import { initNotifications } from "./notifications.js";

initShellNavigation();
initNotifications();
initRevealAnimations();

const auth = getAuth(app);

// ── DOM refs ──
const authSection    = document.getElementById("authSection");
const profileSection = document.getElementById("profileSection");

// Loading state dikhao jab tak auth check ho
authSection.style.display    = "none";
profileSection.style.display = "none";

// ── Auth state ──
onAuthStateChanged(auth, async user => {
  if (user) {
    authSection.style.display    = "none";
    profileSection.style.display = "block";
    await loadProfile(user);
    initRevealAnimations();
  } else {
    authSection.style.display    = "block";
    profileSection.style.display = "none";
    initRevealAnimations();
  }
});

// ── Tab switch (Login / Signup) ──
document.querySelectorAll(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    document.getElementById("loginForm").style.display  = target === "login"  ? "block" : "none";
    document.getElementById("signupForm").style.display = target === "signup" ? "block" : "none";
    clearErrors();
  });
});

function clearErrors() {
  document.querySelectorAll(".auth-error").forEach(e => e.textContent = "");
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

// ── Signup ──
document.getElementById("signupBtn").addEventListener("click", async () => {
  const name  = document.getElementById("signupName").value.trim();
  const phone  = document.getElementById("signupPhone").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const pass  = document.getElementById("signupPass").value;
  clearErrors();
  if (!name)  return showError("signupError", "Please enter your full name.");
  if (!phone) return showError("signupError", "Please enter your mobile number.");
  if (!email) return showError("signupError", "Please enter your email address.");
  if (pass.length < 6) return showError("signupError", "Password must be at least 6 characters.");
  const btn = document.getElementById("signupBtn");
  btn.disabled = true; btn.textContent = "Creating...";
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", cred.user.uid), {
      name, email, phone,
      createdAt: serverTimestamp(),
      historyCount: 0,
    });
  } catch(e) {
    showError("signupError", friendlyError(e.code));
  } finally {
    btn.disabled = false; btn.textContent = "Create Account";
  }
});

// ── Login ──
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const pass  = document.getElementById("loginPass").value;
  clearErrors();
  if (!email || !pass) return showError("loginError", "Please enter your email and password.");
  const btn = document.getElementById("loginBtn");
  btn.disabled = true; btn.textContent = "Logging in...";
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(e) {
    showError("loginError", friendlyError(e.code));
  } finally {
    btn.disabled = false; btn.textContent = "Login";
  }
});

// ── Logout ──
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
});

// ── Friendly error messages ──
function friendlyError(code) {
  const map = {
    "auth/email-already-in-use": "This email is already registered.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/wrong-password": "Incorrect password.",
    "auth/user-not-found": "No account found with this email.",
    "auth/weak-password": "Password is too weak.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

// ── Load Profile ──
async function loadProfile(user) {
  const name = user.displayName || user.email.split("@")[0];
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  document.getElementById("profileAvatar").textContent = initials;
  document.getElementById("profileName").textContent   = name;
  document.getElementById("profileEmail").textContent  = "✉ " + user.email;
  document.getElementById("profileUid").textContent    = user.uid;
  document.getElementById("profileJoined").textContent = user.metadata.creationTime
    ? "📅 Joined " + new Date(user.metadata.creationTime).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  // Firestore se phone fetch karo
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists() && snap.data().phone) {
      document.getElementById("profilePhone").textContent = "📱 " + snap.data().phone;
    }
  } catch {}

  // Copy UID button
  document.getElementById("copyUidBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(user.uid).then(() => {
      const btn = document.getElementById("copyUidBtn");
      btn.textContent = "✓ Copied";
      setTimeout(() => btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`, 2000);
    });
  });

  await loadHistory(user.uid, 20, false);
  await loadStats(user.uid);
}

// ── Load History ──
async function loadHistory(uid, maxItems, showAll) {
  const histRef = collection(db, "users", uid, "history");
  const q = query(histRef, orderBy("viewedAt", "desc"), limit(showAll ? 100 : maxItems));
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderHistory(items, snap.size);

  // View All button
  const viewAllBtn = document.getElementById("viewAllBtn");
  if (snap.size >= maxItems && !showAll) {
    viewAllBtn.style.display = "inline-flex";
    viewAllBtn.onclick = () => {
      viewAllBtn.style.display = "none";
      loadHistory(uid, maxItems, true);
    };
  } else {
    viewAllBtn.style.display = "none";
  }
}

function renderHistory(items, total) {
  const grid = document.getElementById("historyGrid");
  const typeLabel = { all:"All", articles:"Articles", tips:"Tips", facts:"Facts", projects:"Projects", resources:"Resources" };
  const typeIcon  = { articles:"📄", tips:"💡", facts:"🔍", projects:"🚀", resources:"🔗" };
  const typeColor = { articles:"rgba(95,142,255,.1)", tips:"rgba(60,200,167,.1)", facts:"rgba(255,178,72,.1)", projects:"rgba(139,92,246,.1)", resources:"rgba(6,182,212,.1)" };
  const textColor = { articles:"var(--brand-2)", tips:"#0d6e55", facts:"#7a4800", projects:"#4c1d95", resources:"#0e7490" };

  const label = typeLabel[activeFilter] || "All";
  document.querySelector(".history-head h2").innerHTML =
    `📖 ${label} History <span class="badge badge-muted">${total} items</span>`;

  if (!items.length) {
    grid.innerHTML = `<div class="state-box" style="min-width:100%;text-align:center">Koi history nahi mili.</div>`;
    return;
  }

  grid.innerHTML = items.map(item => {
    const icon = typeIcon[item.type] || "📄";
    const bg   = typeColor[item.type] || "rgba(95,142,255,.1)";
    const col  = textColor[item.type] || "var(--brand-2)";
    const date = item.viewedAt?.toDate
      ? item.viewedAt.toDate().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })
      : "";
    return `<a class="h-card" href="read.html?type=${item.type}&id=${item.contentId}">
      <span class="h-icon">${icon}</span>
      <span class="h-badge" style="background:${bg};color:${col};border-color:${col}20">${escapeHtml(item.type)}</span>
      <span class="h-title">${escapeHtml(item.title || "Untitled")}</span>
      <span class="h-meta">📅 ${date}</span>
    </a>`;
  }).join("");
}

// ── Load Stats ──
let allHistoryItems = [];
let activeFilter = "all";

async function loadStats(uid) {
  const histRef = collection(db, "users", uid, "history");
  const snap = await getDocs(histRef);
  allHistoryItems = snap.docs.map(d => d.data());

  const counts = { articles: 0, tips: 0, facts: 0, projects: 0, resources: 0 };
  allHistoryItems.forEach(i => { if (counts[i.type] !== undefined) counts[i.type]++; });

  document.getElementById("statArticles").textContent  = counts.articles;
  document.getElementById("statTips").textContent      = counts.tips;
  document.getElementById("statFacts").textContent     = counts.facts;
  document.getElementById("statProjects").textContent  = counts.projects;
  document.getElementById("statResources").textContent = counts.resources;
  document.getElementById("statTotal").textContent     = allHistoryItems.length;

  // Stat card click → filter history
  document.querySelectorAll(".stat-card[data-filter]").forEach(card => {
    card.addEventListener("click", () => {
      const filter = card.dataset.filter;
      // Same card dobara click → reset to all
      activeFilter = (activeFilter === filter && filter !== "all") ? "all" : filter;
      // Active highlight
      document.querySelectorAll(".stat-card[data-filter]").forEach(c =>
        c.classList.toggle("active", c.dataset.filter === activeFilter)
      );
      const filtered = activeFilter === "all"
        ? allHistoryItems
        : allHistoryItems.filter(i => i.type === activeFilter);
      renderHistory(filtered, filtered.length);
      document.querySelector(".history-section").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// ── Record history (called from read.js) ──
export async function recordHistory({ uid, contentId, type, title, category }) {
  if (!uid || !contentId) return;
  try {
    await setDoc(doc(db, "users", uid, "history", contentId), {
      contentId, type, title: title || "", category: category || "",
      viewedAt: serverTimestamp(),
    });
  } catch {}
}

// ── Expose auth for read.js ──
export { auth, onAuthStateChanged };
