function currentPageName() {
  const path = window.location.pathname;
  const page = path.split("/").pop();
  return page || "index.html";
}

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function parseTags(rawValue) {
  if (!rawValue) return [];
  if (Array.isArray(rawValue)) return rawValue;
  return String(rawValue)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function formatDate(timestamp) {
  if (!timestamp) return "Just now";
  const date = typeof timestamp?.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function initRevealAnimations() {
  const revealEls = document.querySelectorAll(".reveal");
  if (!revealEls.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );
  revealEls.forEach((el) => observer.observe(el));
}

export function initShellNavigation() {
  const sideDrawer = document.getElementById("sideDrawer");
  const drawerOverlay = document.getElementById("drawerOverlay");
  const openBtn = document.getElementById("openDrawer");
  const closeBtn = document.getElementById("closeDrawer");

  function closeDrawer() {
    if (sideDrawer) sideDrawer.classList.remove("open");
    if (drawerOverlay) drawerOverlay.classList.remove("show");
  }

  function openDrawer() {
    if (sideDrawer) sideDrawer.classList.add("open");
    if (drawerOverlay) drawerOverlay.classList.add("show");
  }

  openBtn?.addEventListener("click", openDrawer);
  closeBtn?.addEventListener("click", closeDrawer);
  drawerOverlay?.addEventListener("click", closeDrawer);
  sideDrawer?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeDrawer);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });

  const activePage = currentPageName();
  document.querySelectorAll(".js-nav-link").forEach((link) => {
    const href = link.getAttribute("href") || "";
    link.classList.toggle("active", href === activePage);
  });

  // Bookmark count badge
  try {
    const bms = JSON.parse(localStorage.getItem("bs_bookmarks") || "[]");
    document.querySelectorAll(".bm-count-badge").forEach(el => {
      el.textContent = bms.length;
      el.style.display = bms.length ? "inline" : "none";
    });
  } catch {}

  // Profile icon in topbar
  injectProfileIcon();
}

function injectProfileIcon() {
  const topbar = document.querySelector(".topbar");
  if (!topbar || document.getElementById("profileTopBtn")) return;

  // Current page ke hisaab se profile.html ka sahi path
  const isInSubdir = window.location.pathname.includes("/web-admin/");
  const profileHref = isInSubdir ? "../profile.html" : "profile.html";

  const btn = document.createElement("a");
  btn.id = "profileTopBtn";
  btn.href = profileHref;
  btn.className = "icon-btn";
  btn.title = "Profile";
  btn.setAttribute("aria-label", "Profile");
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

  import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js").then(({ getAuth, onAuthStateChanged }) => {
    import("./firebase-config.js").then(({ app }) => {
      const auth = getAuth(app);
      onAuthStateChanged(auth, user => {
        if (user) {
          const name = user.displayName || user.email.split("@")[0];
          const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
          btn.textContent = initials;
          btn.style.cssText = "background:linear-gradient(135deg,var(--brand-2),var(--brand-1));color:#fff;font-weight:700;font-size:.8rem;font-family:'Space Grotesk',sans-serif;border-color:transparent";
        } else {
          btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
          btn.style.cssText = "";
        }
      });
    });
  });

  const menuBtn = topbar.querySelector(".menu-btn");
  if (menuBtn) topbar.insertBefore(btn, menuBtn);
  else topbar.appendChild(btn);
}
