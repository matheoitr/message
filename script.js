/**
 * script.js — Un mot pour Matheo
 * Logique : envoi de messages, interface admin, nuage de mots, suppression.
 * Utilise Firebase Firestore (SDK v9 compat) via firebase-config.js.
 */

import { db } from "./firebase-config.js";

// ── Constantes ────────────────────────────────────────────────────────────
const ADMIN_PASSWORD   = "X7kP2mQa91";   // ← modifiez ce mot de passe
const MESSAGE_LIMIT    = 1200;
const COLLECTION       = "messages";

// Mots-outils français + termes génériques à filtrer du nuage
const STOP_WORDS = new Set([
  "alors","au","aucun","aussi","autre","aux","avec","avoir","bon","car","ce",
  "cela","ces","ceux","chaque","ci","comme","comment","dans","des","du","dedans",
  "dehors","depuis","devrait","doit","donc","droite","debut","elle","elles","en",
  "encore","est","et","eu","fait","faites","fois","font","haut","hors","ici","il",
  "ils","je","juste","la","le","les","leur","ma","maintenant","mais","mes",
  "moins","mon","meme","ni","notre","nous","ou","par","parce","pas","peut","peu",
  "pour","pourquoi","quand","que","quel","quelle","quelles","quels","qui","sa",
  "sans","ses","seulement","si","sien","son","sont","sous","sur","ta","tandis",
  "tellement","tels","tes","ton","tous","tout","trop","tres","tu","votre","vous",
  "vu","ca","etaient","etat","etions","ete","etre","matheo","mot","mots",
  "message","messages","cette","cet","dune","dun","cest","jai","merci",
  "bonjour","salut","bonne","bonne","voila","bien","tres","plus","dont","veux",
  "veux","tout","quelque","chose","vraiment","aussi","fois","tous","toi","moi",
  "lui","une","pas","non","oui","lui","eux","aux","ces","ceux",
]);

// ── Sélection des éléments DOM ────────────────────────────────────────────
const el = {
  form              : document.getElementById("message-form"),
  textarea          : document.getElementById("message-input"),
  charCount         : document.getElementById("char-count"),
  sendButton        : document.getElementById("send-button"),
  adminAccessButton : document.getElementById("admin-access-button"),
  toastContainer    : document.getElementById("toast-container"),

  passwordModal : document.getElementById("password-modal"),
  passwordForm  : document.getElementById("password-form"),
  passwordInput : document.getElementById("admin-password"),

  adminPanel  : document.getElementById("admin-panel"),
  closeAdmin  : document.getElementById("close-admin"),
  editToggle  : document.getElementById("edit-toggle"),
  editStatus  : document.getElementById("edit-status"),

  messagesGrid  : document.getElementById("messages-grid"),
  messagesEmpty : document.getElementById("messages-empty"),

  confirmModal  : document.getElementById("confirm-modal"),
  confirmDelete : document.getElementById("confirm-delete"),
  confirmCancel : document.getElementById("confirm-cancel"),

  cloudCanvas : document.getElementById("word-cloud-canvas"),
  cloudEmpty  : document.getElementById("word-cloud-empty"),

  tabs   : [...document.querySelectorAll(".tab-button")],
  panels : [...document.querySelectorAll(".tab-panel")],
};

// ── État applicatif ────────────────────────────────────────────────────────
const state = {
  messages          : [],
  editMode          : false,
  pendingDeleteId   : null,
  unsubscribe       : null,
  passwordOpener    : null,
  activeTab         : "cloud",
};

// ── Initialisation ─────────────────────────────────────────────────────────
function init() {
  bindEvents();
  updateCounter();
  prepareCanvas();
  window.addEventListener("resize", debounce(() => {
    prepareCanvas();
    if (state.activeTab === "cloud") renderCloud();
  }, 180));
}

// ── Liaisons d'événements ──────────────────────────────────────────────────
function bindEvents() {
  el.form.addEventListener("submit", handleSubmit);
  el.textarea.addEventListener("input", updateCounter);

  el.adminAccessButton.addEventListener("click", () => openPasswordModal(el.adminAccessButton));
  el.passwordForm.addEventListener("submit", handlePasswordSubmit);

  el.closeAdmin.addEventListener("click", closeAdminPanel);
  el.editToggle.addEventListener("click", toggleEditMode);

  el.confirmDelete.addEventListener("click", confirmDeletion);
  el.confirmCancel.addEventListener("click", closeConfirmModal);

  // Fermeture des modales via data-close-modal
  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", closePasswordModal);
  });

  // Onglets
  el.tabs.forEach(tab => {
    tab.addEventListener("click", () => setTab(tab.dataset.tabTarget));
  });

  // Suppression dans la grille
  el.messagesGrid.addEventListener("click", evt => {
    const btn = evt.target.closest("[data-delete-id]");
    if (!btn) return;
    state.pendingDeleteId = btn.dataset.deleteId;
    openConfirmModal();
  });

  // Touche Échap
  document.addEventListener("keydown", evt => {
    if (evt.key !== "Escape") return;
    if (!el.confirmModal.classList.contains("hidden"))  { closeConfirmModal();  return; }
    if (!el.passwordModal.classList.contains("hidden")) { closePasswordModal(); return; }
    if (!el.adminPanel.classList.contains("hidden"))    { closeAdminPanel();    return; }
  });
}

// ── Compteur de caractères ─────────────────────────────────────────────────
function updateCounter() {
  el.charCount.textContent = `${el.textarea.value.length} / ${MESSAGE_LIMIT}`;
}

// ── Envoi d'un message ─────────────────────────────────────────────────────
async function handleSubmit(evt) {
  evt.preventDefault();
  const text = el.textarea.value.trim();

  if (!text) {
    showToast("❌ Veuillez écrire un message", "error");
    el.textarea.focus();
    return;
  }
  if (text.length > MESSAGE_LIMIT) {
    showToast("❌ Message trop long", "error");
    return;
  }

  setSending(true);

  try {
    const customId = await nextId();
    await db.collection(COLLECTION).add({
      customId,
      text,
      createdAt  : firebase.firestore.FieldValue.serverTimestamp(),
      createdAtMs: Date.now(),
    });
    el.textarea.value = "";
    updateCounter();
    pulse(el.sendButton);
    showToast("✅ Message envoyé", "success");
  } catch (err) {
    console.error(err);
    showToast("❌ Impossible d'envoyer le message", "error");
  } finally {
    setSending(false);
  }
}

async function nextId() {
  const snap = await db.collection(COLLECTION).orderBy("customId", "desc").limit(1).get();
  if (snap.empty) return 1;
  const last = snap.docs[0].data().customId;
  return Number.isInteger(last) ? last + 1 : 1;
}

function setSending(loading) {
  el.sendButton.disabled = loading;
  el.sendButton.innerHTML = loading
    ? `<span>Envoi en cours…</span>`
    : `<span>Envoyer le message</span>
       <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <path d="M5 12h14M13 5l7 7-7 7"></path>
       </svg>`;
}

// ── Modale mot de passe ────────────────────────────────────────────────────
function openPasswordModal(opener) {
  state.passwordOpener = opener || null;
  el.passwordModal.classList.remove("hidden");
  el.passwordModal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => el.passwordInput.focus());
}

function closePasswordModal() {
  el.passwordModal.classList.add("hidden");
  el.passwordModal.setAttribute("aria-hidden", "true");
  el.passwordForm.reset();
  state.passwordOpener?.focus();
}

function handlePasswordSubmit(evt) {
  evt.preventDefault();
  if (el.passwordInput.value.trim() !== ADMIN_PASSWORD) {
    showToast("❌ Mot de passe incorrect", "error");
    el.passwordInput.select();
    return;
  }
  closePasswordModal();
  openAdminPanel();
}

// ── Panel admin ────────────────────────────────────────────────────────────
function openAdminPanel() {
  el.adminPanel.classList.remove("hidden");
  el.adminPanel.setAttribute("aria-hidden", "false");
  setTab("cloud");
  subscribe();
}

function closeAdminPanel() {
  el.adminPanel.classList.add("hidden");
  el.adminPanel.setAttribute("aria-hidden", "true");
  disableEdit();
  state.unsubscribe?.();
  state.unsubscribe = null;
}

function subscribe() {
  state.unsubscribe?.();
  state.unsubscribe = db
    .collection(COLLECTION)
    .orderBy("customId", "asc")
    .onSnapshot(
      snap => {
        state.messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderGrid();
        if (state.activeTab === "cloud") renderCloud();
      },
      err => {
        console.error(err);
        showToast("❌ Impossible de charger les messages", "error");
      }
    );
}

// ── Onglets ────────────────────────────────────────────────────────────────
function setTab(name) {
  state.activeTab = name;
  el.tabs.forEach(tab => {
    const active = tab.dataset.tabTarget === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  el.panels.forEach(panel => {
    const active = panel.id === `panel-${name}`;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
  if (name === "cloud") renderCloud();
}

// ── Grille messages ────────────────────────────────────────────────────────
function renderGrid() {
  el.messagesGrid.innerHTML = "";

  if (!state.messages.length) {
    el.messagesEmpty.classList.remove("hidden");
    return;
  }
  el.messagesEmpty.classList.add("hidden");
  el.messagesGrid.classList.toggle("edit-mode", state.editMode);

  const frag = document.createDocumentFragment();
  [...state.messages]
    .sort((a, b) => (a.customId || 0) - (b.customId || 0))
    .forEach(msg => {
      const art = document.createElement("article");
      art.className = "message-card";
      art.innerHTML = `
        <button type="button" class="delete-btn" data-delete-id="${msg.id}" aria-label="Supprimer le message ${msg.customId || ""}">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M6 6 18 18M18 6 6 18"></path>
          </svg>
        </button>
        <div class="message-card-header">
          <span class="message-id">#${msg.customId ?? "?"}</span>
          <span class="message-date">${fmtDate(msg)}</span>
        </div>
        <p class="message-content"></p>
      `;
      art.querySelector(".message-content").textContent = msg.text || "";
      frag.appendChild(art);
    });
  el.messagesGrid.appendChild(frag);
}

function fmtDate(msg) {
  const d = msg.createdAt?.toDate?.() || new Date(msg.createdAtMs || Date.now());
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

// ── Mode édition ───────────────────────────────────────────────────────────
function toggleEditMode() {
  state.editMode = !state.editMode;
  el.editToggle.classList.toggle("active", state.editMode);
  el.editToggle.setAttribute("aria-label",
    state.editMode ? "Désactiver le mode édition" : "Activer le mode édition");
  el.editStatus.textContent = state.editMode ? "Mode édition" : "Mode lecture";
  el.messagesGrid.classList.toggle("edit-mode", state.editMode);
}

function disableEdit() {
  state.editMode = false;
  el.editToggle.classList.remove("active");
  el.editStatus.textContent = "Mode lecture";
  el.messagesGrid.classList.remove("edit-mode");
}

// ── Modale confirmation ────────────────────────────────────────────────────
function openConfirmModal() {
  el.confirmModal.classList.remove("hidden");
  el.confirmModal.setAttribute("aria-hidden", "false");
  el.confirmDelete.focus();
}

function closeConfirmModal() {
  el.confirmModal.classList.add("hidden");
  el.confirmModal.setAttribute("aria-hidden", "true");
  state.pendingDeleteId = null;
}

async function confirmDeletion() {
  if (!state.pendingDeleteId) { closeConfirmModal(); return; }
  try {
    await db.collection(COLLECTION).doc(state.pendingDeleteId).delete();
    showToast("🗑️ Message supprimé", "success");
  } catch (err) {
    console.error(err);
    showToast("❌ Suppression impossible", "error");
  } finally {
    closeConfirmModal();
  }
}

// ── Nuage de mots ──────────────────────────────────────────────────────────
function renderCloud() {
  if (typeof WordCloud !== "function") return;

  const entries = buildEntries(state.messages);
  if (!entries.length) {
    el.cloudEmpty.classList.remove("hidden");
    clearCanvas();
    return;
  }

  el.cloudEmpty.classList.add("hidden");
  prepareCanvas();
  clearCanvas();

  const COLORS = ["#6d97ff","#4f83ff","#2ecc8f","#8e63ff","#1e3a5f","#5b6b8a","#0f172a"];

  WordCloud(el.cloudCanvas, {
    list        : entries,
    gridSize    : Math.max(8, Math.round(el.cloudCanvas.width / 48)),
    weightFactor: size => Math.max(16, size * (el.cloudCanvas.width / 900) * 1.9),
    fontFamily  : '"Manrope", "Inter", sans-serif',
    fontWeight  : "700",
    color       : () => COLORS[Math.floor(Math.random() * COLORS.length)],
    backgroundColor: "rgba(0,0,0,0)",
    rotateRatio : 0.06,
    rotationSteps: 2,
    shuffle     : true,
    drawOutOfBound: false,
    shape       : "circle",
    ellipticity : 0.82,
  });
}

function buildEntries(messages) {
  const counts = new Map();
  messages.forEach(({ text = "" }) => {
    text
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s'-]/g, " ")
      .split(/\s+/)
      .forEach(w => {
        const word = w.replace(/^[-']+|[-']+$/g, "");
        if (word.length < 3) return;
        if (STOP_WORDS.has(word)) return;
        counts.set(word, (counts.get(word) || 0) + 1);
      });
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80)
    .map(([w, n]) => [w, Math.max(12, n * 10)]);
}

function prepareCanvas() {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const w     = Math.max(el.cloudCanvas.clientWidth  || 760, 320);
  const h     = Math.max(Math.min(Math.round(w * 0.58), 520), 300);

  el.cloudCanvas.width         = w * ratio;
  el.cloudCanvas.height        = h * ratio;
  el.cloudCanvas.style.width   = `${w}px`;
  el.cloudCanvas.style.height  = `${h}px`;

  const ctx = el.cloudCanvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function clearCanvas() {
  const ctx = el.cloudCanvas.getContext("2d");
  ctx.clearRect(0, 0, el.cloudCanvas.width, el.cloudCanvas.height);
}

// ── Toasts ─────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", "status");
  toast.textContent = msg;
  el.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, 2800);
}

// ── Utilitaires ────────────────────────────────────────────────────────────
function pulse(target) {
  target.classList.remove("success-pulse");
  void target.offsetWidth;
  target.classList.add("success-pulse");
}

function debounce(fn, delay = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Lancement ─────────────────────────────────────────────────────────────
init();
