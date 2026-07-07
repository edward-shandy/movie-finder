// =========================================================
// MovieDex — search + entries (OMDb API)
// =========================================================
const OMDB_URL = "https://www.omdbapi.com/";
const OMDB_KEY = "7bc4e295";

const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const list = document.getElementById("list-movie");
const head = document.getElementById("results-head");
const titleEl = document.getElementById("results-title");
const metaEl = document.getElementById("results-meta");

const modal = document.getElementById("movie-modal");
const modalNumber = document.getElementById("modal-number");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");

// Poster placeholder styled like a "no signal" screen
const NO_POSTER =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
    <rect width="300" height="450" fill="#e2e7f0"/>
    <circle cx="150" cy="205" r="46" fill="#fff" stroke="#12131f" stroke-width="8"/>
    <path d="M104 205h92" stroke="#12131f" stroke-width="8"/>
    <circle cx="150" cy="205" r="15" fill="#fff" stroke="#12131f" stroke-width="8"/>
    <path d="M104 205a46 46 0 0 1 92 0" fill="#ee1515"/>
    <text x="150" y="300" font-family="VT323, monospace" font-size="26" fill="#4a4c60" text-anchor="middle">NO POSTER DATA</text>
  </svg>`);

const posterOf = (src) => (src && src !== "N/A" ? src : NO_POSTER);
const pad = (n) => String(n).padStart(3, "0");

function esc(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// Genre -> "type" color, echoing Pokémon type badges
const TYPE_COLORS = {
  Action: "#ee1515", Adventure: "#e07b2e", Comedy: "#f4c025", Drama: "#7c538c",
  Horror: "#3a3546", "Sci-Fi": "#2a75bb", Fantasy: "#a24ec7", Romance: "#e97ba3",
  Animation: "#28b2a0", Crime: "#6f5848", Thriller: "#4a5bc0", Family: "#5cae4a",
  Mystery: "#5a6ac9", Documentary: "#7a8a99", Biography: "#b08a3e", History: "#9a7b4f",
  Music: "#d65da0", War: "#556b2f", Western: "#c58a3c", Sport: "#2fa3a3",
};
const typeColor = (g) => TYPE_COLORS[g] || "#6b7280";

/* ---------------- Results header ---------------- */
function setHead(title, meta) {
  titleEl.textContent = title;
  metaEl.textContent = meta;
  head.hidden = false;
}

function message(text, isError = false) {
  list.innerHTML = `
    <div class="state">
      <div class="state__ball"></div>
      <p class="state__text" style="${isError ? "color:var(--red-deep)" : ""}">${esc(text)}</p>
    </div>`;
}

/* ---------------- Cards ---------------- */
// `index` is the global 0-based position across all loaded pages
function cardHTML(movie, index) {
  return `
    <article class="card" data-id="${esc(movie.imdbID)}">
      <span class="card__num">#${pad(index + 1)}</span>
      <div class="card__poster">
        <img src="${esc(posterOf(movie.Poster))}" alt="Poster for ${esc(movie.Title)}"
             loading="lazy" onerror="this.onerror=null;this.src='${NO_POSTER}'"/>
      </div>
      <div class="card__body">
        <h3 class="card__title">${esc(movie.Title)}</h3>
        <span class="card__year">${esc(movie.Type || "movie")} · ${esc(movie.Year)}</span>
        <button class="card__btn" type="button" data-id="${esc(movie.imdbID)}">View entry</button>
      </div>
    </article>`;
}

const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function revealNodes(nodes) {
  if (!nodes.length || !window.gsap || prefersReduced()) return;
  window.gsap.from(nodes, {
    opacity: 0,
    y: 18,
    duration: 0.5,
    ease: "power3.out",
    stagger: { each: 0.05, from: "start" },
    clearProps: "opacity,transform",
  });
}

/* ---------------- Search + infinite scroll ---------------- */
const loader = document.getElementById("loader");
const endNote = document.getElementById("results-end");
const sentinel = document.getElementById("scroll-sentinel");

// OMDb serves 10 results per page; page maxes out at 100.
const state = { query: "", page: 1, total: 0, loaded: 0, loading: false, done: true };

const metaText = () => `${state.loaded} / ${state.total} logged`;

async function fetchPage(query, page) {
  const res = await fetch(
    `${OMDB_URL}?apikey=${OMDB_KEY}&s=${encodeURIComponent(query)}&page=${page}`
  );
  return res.json();
}

function appendMovies(movies) {
  const offset = state.loaded;
  list.insertAdjacentHTML("beforeend", movies.map((m, i) => cardHTML(m, offset + i)).join(""));
  state.loaded += movies.length;
  revealNodes([...list.querySelectorAll(".card")].slice(offset));
}

function checkDone() {
  if (state.loaded >= state.total || state.page >= 100) {
    state.done = true;
    endNote.hidden = false;
    endNote.textContent = `✦ All ${state.total} entries logged ✦`;
  }
}

async function startSearch(query) {
  Object.assign(state, { query, page: 1, total: 0, loaded: 0, loading: true, done: false });
  endNote.hidden = true;
  setHead(`Scanning “${query}”`, "Reading database…");
  message("Scanning…");

  try {
    const data = await fetchPage(query, 1);
    if (data.Response === "True") {
      state.total = parseInt(data.totalResults, 10) || data.Search.length;
      list.innerHTML = "";
      appendMovies(data.Search);
      setHead(`Entries for “${query}”`, metaText());
      window.dispatchEvent(new CustomEvent("moviedex:catch")); // Pokéball catch-wobble
      checkDone();
    } else {
      state.done = true;
      setHead(`Entries for “${query}”`, "0 logged");
      message(
        data.Error === "Movie not found!" ? `No entries match “${query}”. Try another title.` : data.Error
      );
    }
  } catch (err) {
    state.done = true;
    setHead(`Entries for “${query}”`, "Signal lost");
    message("Couldn’t reach the database. Check your connection and scan again.", true);
  } finally {
    state.loading = false;
  }
}

async function loadMore() {
  if (state.loading || state.done || !state.query) return;
  state.loading = true;
  state.page += 1;
  loader.hidden = false;
  try {
    const data = await fetchPage(state.query, state.page);
    if (data.Response === "True") {
      appendMovies(data.Search);
      setHead(`Entries for “${state.query}”`, metaText());
    } else {
      state.done = true; // ran past the last page
    }
  } catch (err) {
    state.done = true;
  } finally {
    loader.hidden = true;
    state.loading = false;
    checkDone();
  }
}

if ("IntersectionObserver" in window) {
  new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMore();
    },
    { rootMargin: "600px 0px" }
  ).observe(sentinel);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (q) startSearch(q);
});

/* ---------------- Night-mode toggle ---------------- */
document.getElementById("theme-toggle").addEventListener("click", () => {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem("moviedex-theme", next);
  } catch (e) {}
});

/* ---------------- Detail modal ---------------- */
function typePills(genre) {
  if (!genre || genre === "N/A") return "";
  const pills = genre
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean)
    .map((g) => `<span class="type" style="background:${typeColor(g)}">${esc(g)}</span>`)
    .join("");
  return `<div class="types">${pills}</div>`;
}

function ratingStat(imdbRating) {
  const r = parseFloat(imdbRating);
  if (isNaN(r)) return "";
  const pct = Math.max(0, Math.min(100, r * 10));
  const color = pct >= 70 ? "var(--green)" : pct >= 45 ? "var(--yellow)" : "var(--red)";
  return `
    <div class="stat">
      <span class="stat__label">Rating</span>
      <div class="meter"><div class="meter__fill" data-pct="${pct}" style="background:${color}"></div></div>
      <span class="stat__value">${esc(imdbRating)}</span>
    </div>`;
}

function fact(k, v) {
  if (!v || v === "N/A") return "";
  return `<li><span class="k">${k}</span><span class="v">${esc(v)}</span></li>`;
}

function renderEntry(m) {
  modalTitle.textContent = m.Title || "Entry";
  modalBody.innerHTML = `
    <div class="entry">
      <div class="entry__poster">
        <img src="${esc(posterOf(m.Poster))}" alt="Poster for ${esc(m.Title)}"
             onerror="this.onerror=null;this.src='${NO_POSTER}'"/>
      </div>
      <div class="entry__meta">
        ${typePills(m.Genre)}
        ${ratingStat(m.imdbRating)}
        <div class="entry__screen">
          <p>${esc(m.Plot && m.Plot !== "N/A" ? m.Plot : "No entry description recorded for this title.")}</p>
        </div>
        <ul class="entry__facts">
          ${fact("Released", m.Released)}
          ${fact("Runtime", m.Runtime)}
          ${fact("Director", m.Director)}
          ${fact("Rated", m.Rated)}
          ${fact("Cast", m.Actors)}
        </ul>
      </div>
    </div>`;

  // Animate the HP bar after paint
  requestAnimationFrame(() => {
    const fill = modalBody.querySelector(".meter__fill");
    if (fill) fill.style.width = fill.dataset.pct + "%";
  });
}

let lastFocused = null;
function openModal() {
  lastFocused = document.activeElement;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add("is-open"));
  document.body.style.overflow = "hidden";
  document.getElementById("modal-close").focus();
}
function closeModal() {
  modal.classList.remove("is-open");
  document.body.style.overflow = "";
  setTimeout(() => {
    modal.hidden = true;
    modalBody.innerHTML = "";
  }, 220);
  if (lastFocused) lastFocused.focus();
}

async function openEntry(id, num) {
  modalNumber.textContent = "#" + pad(num || 0);
  modalTitle.textContent = "Loading…";
  modalBody.innerHTML = `<p class="modal__msg">Reading entry…</p>`;
  openModal();

  try {
    const res = await fetch(`${OMDB_URL}?apikey=${OMDB_KEY}&i=${id}&plot=full`);
    const movie = await res.json();
    if (movie.Response === "True") renderEntry(movie);
    else modalBody.innerHTML = `<p class="modal__msg modal__msg--error">${esc(movie.Error || "Entry not found.")}</p>`;
  } catch (err) {
    modalBody.innerHTML = `<p class="modal__msg modal__msg--error">Couldn’t load this entry. Try again.</p>`;
  }
}

// Delegate clicks on entry cards
list.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-id]");
  if (!btn) return;
  const card = btn.closest(".card");
  const num = card ? [...list.querySelectorAll(".card")].indexOf(card) + 1 : 0;
  openEntry(btn.dataset.id, num);
});

// Close interactions
modal.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeModal();
});
