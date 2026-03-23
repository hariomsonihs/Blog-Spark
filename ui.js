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
}
