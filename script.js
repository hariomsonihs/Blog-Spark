const articles = [
  {
    title: "How to Learn JavaScript in 30 Minutes Daily",
    category: "JavaScript",
    readTime: "6 min read",
    description:
      "Daily micro-practice system with focused tasks, revision loops, and mini output goals.",
  },
  {
    title: "CSS Layout Mastery: Flexbox + Grid Together",
    category: "CSS",
    readTime: "8 min read",
    description:
      "Real layout patterns for cards, dashboards and responsive app screens without confusion.",
  },
  {
    title: "Build Better UI With Glassmorphism",
    category: "UI/UX",
    readTime: "5 min read",
    description:
      "Modern visual style guide with contrast rules, blur layers and accessibility-safe colors.",
  },
  {
    title: "API Handling in Vanilla JavaScript",
    category: "JavaScript",
    readTime: "7 min read",
    description:
      "Fetch, async/await, loading states, and error-first patterns for stable frontend apps.",
  },
  {
    title: "Portfolio That Gets Interviews",
    category: "Career",
    readTime: "5 min read",
    description:
      "How to present projects, write case studies and optimize your profile for hiring managers.",
  },
  {
    title: "Frontend Performance Basics",
    category: "Web Performance",
    readTime: "9 min read",
    description:
      "Simple wins using image optimization, lazy rendering and animation budgeting for smooth UX.",
  },
];

const tips = [
  "Use 25-minute focus blocks and track one small coding win daily.",
  "Always ship a tiny version first, then improve with feedback.",
  "Name CSS classes by purpose, not color or size.",
  "Keep a reusable snippets file for frequently used JS logic.",
  "Before debugging, write expected input-output on paper once.",
  "Use `clamp()` for fluid typography and spacing in responsive UI.",
];

const facts = [
  "JavaScript was created in just 10 days in 1995.",
  "The first website is still online at info.cern.ch.",
  "Around half of web traffic comes from mobile devices worldwide.",
  "CSS stands for Cascading Style Sheets, where cascade decides final style.",
  "Human-friendly code readability often beats micro-optimizations in teams.",
  "Most production bugs are from edge cases, not core logic.",
  "Dark patterns in UI can increase churn and reduce user trust.",
];

const projects = [
  {
    name: "Expense Tracker",
    level: "Beginner",
    stack: "HTML, CSS, JS",
    description:
      "Track income/expense with local storage and simple charts-ready data model.",
    code: `const tx = JSON.parse(localStorage.getItem('tx') || '[]');\nfunction addTransaction(item){\n  tx.push(item);\n  localStorage.setItem('tx', JSON.stringify(tx));\n  renderTransactions();\n}`,
  },
  {
    name: "Weather Dashboard",
    level: "Intermediate",
    stack: "JS + API",
    description:
      "City weather app with search history, loading states and temperature units switch.",
    code: `async function getWeather(city){\n  const res = await fetch('/weather?city=' + city);\n  if(!res.ok) throw new Error('Weather API failed');\n  const data = await res.json();\n  updateUI(data);\n}`,
  },
  {
    name: "Habit Streak App",
    level: "Intermediate",
    stack: "HTML, CSS, JS",
    description:
      "Track daily habits with streak counters and motivational reminder cards.",
    code: `function markDone(habitId){\n  state[habitId].streak += 1;\n  state[habitId].lastDone = Date.now();\n  saveState();\n  renderHabits();\n}`,
  },
  {
    name: "Markdown Notes",
    level: "Advanced",
    stack: "JS, Marked",
    description:
      "Create/edit notes with live markdown preview and tag based filtering.",
    code: `editor.addEventListener('input', (e) => {\n  preview.innerHTML = marked.parse(e.target.value);\n});\nfunction saveNote(){\n  localStorage.setItem('note', editor.value);\n}`,
  },
];

const refs = {
  articlesGrid: document.getElementById("articlesGrid"),
  tipsWall: document.getElementById("tipsWall"),
  factText: document.getElementById("factText"),
  newFactBtn: document.getElementById("newFactBtn"),
  projectsGrid: document.getElementById("projectsGrid"),
  articleFilters: document.getElementById("articleFilters"),
  articleCount: document.getElementById("articleCount"),
  tipsCount: document.getElementById("tipsCount"),
  projectsCount: document.getElementById("projectsCount"),
  codeModal: document.getElementById("codeModal"),
  modalTitle: document.getElementById("modalTitle"),
  modalCode: document.getElementById("modalCode"),
  closeModal: document.getElementById("closeModal"),
  sideDrawer: document.getElementById("sideDrawer"),
  drawerOverlay: document.getElementById("drawerOverlay"),
  openDrawer: document.getElementById("openDrawer"),
  closeDrawer: document.getElementById("closeDrawer"),
};

const allNavLinks = Array.from(document.querySelectorAll(".nav-link"));
const sectionIds = ["home", "articles", "tips", "facts", "projects", "resources"];
let selectedCategory = "All";

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFilteredArticles() {
  if (selectedCategory === "All") return articles;
  return articles.filter((item) => item.category === selectedCategory);
}

function renderArticles() {
  const filtered = getFilteredArticles();
  refs.articlesGrid.innerHTML = filtered
    .map(
      (item) => `
      <article>
        <span class="meta-pill">${item.category}</span>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <div class="project-footer">
          <small>${item.readTime}</small>
          <button type="button" class="code-btn">Read</button>
        </div>
      </article>
    `
    )
    .join("");
}

function renderFilters() {
  const categories = ["All", ...new Set(articles.map((item) => item.category))];
  refs.articleFilters.innerHTML = categories
    .map(
      (category) =>
        `<button class="chip ${
          category === selectedCategory ? "active" : ""
        }" data-category="${category}">${category}</button>`
    )
    .join("");

  refs.articleFilters.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      selectedCategory = chip.dataset.category;
      renderFilters();
      renderArticles();
    });
  });
}

function renderTips() {
  refs.tipsWall.innerHTML = tips
    .map(
      (tip, i) => `
      <article>
        <span class="meta-pill">Tip ${String(i + 1).padStart(2, "0")}</span>
        <p>${tip}</p>
      </article>
    `
    )
    .join("");
}

function setRandomFact() {
  const random = facts[Math.floor(Math.random() * facts.length)];
  refs.factText.textContent = random;
}

function renderProjects() {
  refs.projectsGrid.innerHTML = projects
    .map(
      (project, index) => `
      <article class="project-card">
        <span class="meta-pill">${project.level}</span>
        <h3>${project.name}</h3>
        <p>${project.description}</p>
        <div class="project-meta">
          <span class="meta-pill">${project.stack}</span>
          <span class="meta-pill">Ready to build</span>
        </div>
        <div class="project-footer">
          <small>Project ${index + 1}</small>
          <button class="code-btn" data-project-index="${index}">View Code</button>
        </div>
      </article>
    `
    )
    .join("");

  refs.projectsGrid.querySelectorAll("[data-project-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const project = projects[Number(btn.dataset.projectIndex)];
      refs.modalTitle.textContent = `${project.name} - source preview`;
      refs.modalCode.innerHTML = escapeHtml(project.code);
      refs.codeModal.showModal();
    });
  });
}

function closeDrawer() {
  refs.sideDrawer.classList.remove("open");
  refs.drawerOverlay.classList.remove("show");
}

function openDrawer() {
  refs.sideDrawer.classList.add("open");
  refs.drawerOverlay.classList.add("show");
}

function bindDrawerEvents() {
  refs.openDrawer.addEventListener("click", openDrawer);
  refs.closeDrawer.addEventListener("click", closeDrawer);
  refs.drawerOverlay.addEventListener("click", closeDrawer);
  refs.sideDrawer.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeDrawer);
  });
}

function setCounts() {
  refs.articleCount.textContent = articles.length;
  refs.tipsCount.textContent = tips.length;
  refs.projectsCount.textContent = projects.length;
}

function setActiveNav(hash) {
  if (!hash) return;
  allNavLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === hash);
  });
}

function initActiveSectionObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveNav(`#${entry.target.id}`);
        }
      });
    },
    { rootMargin: "-40% 0px -40% 0px", threshold: 0.2 }
  );

  sectionIds.forEach((id) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}

function bindSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;
      const target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", targetId);
      setActiveNav(targetId);
    });
  });
}

function initRevealAnimations() {
  const revealEls = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealEls.forEach((el) => revealObserver.observe(el));
}

function bindModalEvents() {
  refs.closeModal.addEventListener("click", () => refs.codeModal.close());
  refs.codeModal.addEventListener("click", (event) => {
    const box = refs.codeModal.querySelector("article").getBoundingClientRect();
    const inDialog =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;

    if (!inDialog) refs.codeModal.close();
  });
}

function bindGlobalKeys() {
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
      if (refs.codeModal.open) refs.codeModal.close();
    }
  });
}

function init() {
  setCounts();
  renderFilters();
  renderArticles();
  renderTips();
  setRandomFact();
  renderProjects();

  refs.newFactBtn.addEventListener("click", setRandomFact);

  bindSmoothScroll();
  bindDrawerEvents();
  bindModalEvents();
  bindGlobalKeys();
  initRevealAnimations();
  initActiveSectionObserver();
}

init();
