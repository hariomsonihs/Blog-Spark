import { db } from "./firebase-config.js";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, deleteDoc, doc, serverTimestamp, limit,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js";
import { app } from "./firebase-config.js";

// ── VAPID Key (Firebase Console → Project Settings → Cloud Messaging → Web Push certificates)
const VAPID_KEY = "YOUR_VAPID_KEY_HERE";

const NOTIF_COLLECTION = "notifications";

// ── Bell button inject karo topbar mein ──────────────────────────────────────
function injectBell() {
  const topbar = document.querySelector(".topbar");
  if (!topbar || document.getElementById("notifBell")) return;

  const bellWrap = document.createElement("div");
  bellWrap.className = "notif-wrap";
  bellWrap.innerHTML = `
    <button class="icon-btn notif-bell" id="notifBell" aria-label="Notifications" title="Notifications">
      <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <span class="notif-badge" id="notifBadge" style="display:none">0</span>
    </button>
    <div class="notif-panel" id="notifPanel" aria-label="Notification panel">
      <div class="notif-panel-head">
        <span>🔔 Notifications</span>
        <div style="display:flex;gap:.4rem">
          <button class="small-btn" id="markAllReadBtn" title="Mark all as read">✓ All Read</button>
          <button class="icon-btn" id="closeNotifPanel" aria-label="Close" style="width:30px;height:30px">
            <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div class="notif-list" id="notifList">
        <div class="notif-empty">No notifications yet</div>
      </div>
    </div>
  `;

  // Insert bell before menu-btn (hamburger)
  const menuBtn = topbar.querySelector(".menu-btn");
  if (menuBtn) topbar.insertBefore(bellWrap, menuBtn);
  else topbar.appendChild(bellWrap);

  // Panel ko body mein move karo taaki overflow-x:hidden affect na kare
  const panel = bellWrap.querySelector("#notifPanel");
  document.body.appendChild(panel);

  // Toggle panel
  document.getElementById("notifBell").addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("notifPanel").classList.toggle("open");
  });
  document.getElementById("closeNotifPanel").addEventListener("click", () => {
    document.getElementById("notifPanel").classList.remove("open");
  });
  document.addEventListener("click", (e) => {
    const panel = document.getElementById("notifPanel");
    const bell = document.getElementById("notifBell");
    if (panel && !panel.contains(e.target) && e.target !== bell) {
      panel.classList.remove("open");
    }
  });

  document.getElementById("markAllReadBtn").addEventListener("click", markAllRead);
}

// ── Firestore se notifications listen karo ───────────────────────────────────
function listenNotifications() {
  const q = query(collection(db, NOTIF_COLLECTION), orderBy("createdAt", "desc"), limit(30));
  onSnapshot(q, (snap) => {
    const notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderNotifList(notifs);
    updateBadge(notifs.filter((n) => !n.read).length);
  });
}

function renderNotifList(notifs) {
  const list = document.getElementById("notifList");
  if (!list) return;
  if (!notifs.length) {
    list.innerHTML = `<div class="notif-empty">No notifications yet</div>`;
    return;
  }

  const categoryIcons = {
    articles: "📄", tips: "💡", facts: "🔍", projects: "🚀", resources: "🔗",
  };

  list.innerHTML = notifs.map((n) => {
    const icon = categoryIcons[n.category?.toLowerCase()] || "🔔";
    const time = n.createdAt?.toDate
      ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(n.createdAt.toDate())
      : "Just now";
    return `
      <div class="notif-item${n.read ? " read" : ""}" data-id="${n.id}">
        <div class="notif-icon">${icon}</div>
        <div class="notif-body" onclick="window.__openNotif('${n.id}','${n.url || ""}')">
          <div class="notif-category">${n.category || "Update"}</div>
          <div class="notif-title">${escHtml(n.title || "New content added")}</div>
          <div class="notif-time">${time}</div>
        </div>
        <div class="notif-actions">
          ${!n.read ? `<button class="notif-action-btn" title="Mark as read" onclick="window.__markRead('${n.id}')">✓</button>` : ""}
          <button class="notif-action-btn danger" title="Delete" onclick="window.__deleteNotif('${n.id}')">🗑</button>
        </div>
      </div>`;
  }).join("");
}

function updateBadge(count) {
  const badge = document.getElementById("notifBadge");
  if (!badge) return;
  badge.textContent = count > 9 ? "9+" : count;
  badge.style.display = count > 0 ? "flex" : "none";
}

// ── Global handlers (onclick in innerHTML) ───────────────────────────────────
window.__openNotif = async function (id, url) {
  await updateDoc(doc(db, NOTIF_COLLECTION, id), { read: true });
  if (url) window.location.href = url;
};

window.__markRead = async function (id) {
  await updateDoc(doc(db, NOTIF_COLLECTION, id), { read: true });
};

window.__deleteNotif = async function (id) {
  await deleteDoc(doc(db, NOTIF_COLLECTION, id));
};

async function markAllRead() {
  const q = query(collection(db, NOTIF_COLLECTION), orderBy("createdAt", "desc"), limit(30));
  onSnapshot(q, async (snap) => {
    const unread = snap.docs.filter((d) => !d.data().read);
    await Promise.all(unread.map((d) => updateDoc(d.ref, { read: true })));
  }, { once: true });
}

// ── FCM Push Subscription ────────────────────────────────────────────────────
async function subscribePush() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
  if (Notification.permission === "denied") return;

  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const messaging = getMessaging(app);

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    if (token) localStorage.setItem("fcm_token", token);

    // Foreground notification
    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      const data = payload.data || {};
      showInAppToast(title, body, data);
    });
  } catch (e) {
    console.warn("FCM setup:", e.message);
  }
}

// ── In-app toast for foreground notifications ─────────────────────────────────
function showInAppToast(title, body, data) {
  const toast = document.createElement("div");
  toast.className = "push-toast";
  toast.innerHTML = `
    <div class="push-toast-icon">🔔</div>
    <div class="push-toast-text">
      <strong>${escHtml(title || "BlogSpark")}</strong>
      <span>${escHtml(body || "")}</span>
    </div>
    <button class="push-toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  if (data.url) toast.style.cursor = "pointer";
  toast.addEventListener("click", (e) => {
    if (e.target.classList.contains("push-toast-close")) return;
    if (data.url) window.location.href = data.url;
    toast.remove();
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function escHtml(v) {
  return String(v || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// ── Init ─────────────────────────────────────────────────────────────────────
export function initNotifications() {
  injectBell();
  listenNotifications();
  subscribePush();
}

// ── Admin helper: naya content add hone par notification save karo ────────────
export async function saveNotification({ title, category, type, docId }) {
  const typeMap = { articles: "articles", tips: "tips", facts: "facts", projects: "projects", resources: "resources" };
  const col = typeMap[type] || type;
  const url = `read.html?type=${col}&id=${encodeURIComponent(docId)}`;
  await addDoc(collection(db, NOTIF_COLLECTION), {
    title,
    category,
    type: col,
    url,
    read: false,
    createdAt: serverTimestamp(),
  });
}
