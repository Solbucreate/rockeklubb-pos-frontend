// Rockeklubben POS frontend
const API = "https://rockeklubb-pos-backend-xhe6.onrender.com/api";

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const NOK = (n) =>
  new Intl.NumberFormat("no-NO", { style: "currency", currency: "NOK" }).format(
    Number(n || 0)
  );

let db = { categories: ["Bar", "Billetter", "Merch", "Medlemskap"], products: [] };
let state = { tab: "Bar", lines: [] };

// ================= LOGIN FIX =================

// elementer
const fullLogin = document.getElementById("fullLogin");
const loginUser = document.getElementById("fullLoginUser");
const loginPass = document.getElementById("fullLoginPass");
const loginBtn = document.getElementById("fullLoginBtn");
const loginError = document.getElementById("fullLoginError");

// hvis allerede innlogget → skjul login
if (sessionStorage.getItem("loggedIn") === "true") {
  if (fullLogin) fullLogin.style.display = "none";
}

// login handling
async function doLogin() {
  const username = loginUser.value.trim();
  const password = loginPass.value.trim();

  if (!username || !password) {
    loginError.textContent = "Skriv inn brukernavn og passord.";
    loginError.style.display = "block";
    return;
  }

  try {
    const res = await fetch(API + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!data.success) {
      loginError.textContent = "Feil brukernavn eller passord.";
      loginError.style.display = "block";
      return;
    }

    // LOGIN OK
    sessionStorage.setItem("loggedIn", "true");
    loginError.style.display = "none";
    fullLogin.style.display = "none";

  } catch (err) {
    console.error(err);
    loginError.textContent = "Får ikke kontakt med serveren.";
    loginError.style.display = "block";
  }
}

if (loginBtn) {
  loginBtn.addEventListener("click", doLogin);
  loginUser.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginPass.focus();
  });
  loginPass.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
}

// ============ GENERIC API HELPERS ============

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ============ LOAD PRODUCTS ============

async function loadProducts() {
  const rows = await api("/api/products");
  db.products = rows;

  if (rows.length === 0) {
    const seeds = [
      { name: "Øl", category: "Bar", price: 89 },
      { name: "Cider", category: "Bar", price: 95 },
      { name: "Vin glass", category: "Bar", price: 110 },
      { name: "Shot", category: "Bar", price: 95 },
      { name: "Billett – Fredag", category: "Billetter", price: 250 },
      { name: "Billett – Lørdag", category: "Billetter", price: 300 },
      { name: "T-skjorte", category: "Merch", price: 249 },
      { name: "Patch", category: "Merch", price: 79 },
      { name: "Medlemskap 2026", category: "Medlemskap", price: 350 },
    ];

    for (const s of seeds) {
      await api("/api/products", {
        method: "POST",
        body: JSON.stringify(s),
      });
    }

    db.products = await api("/api/products");
  }
}

// ============ UI RENDERING ============

function renderTabs() {
  const tabs = $("#tabs");
  tabs.innerHTML = "";
  db.categories.forEach((cat) => {
    const b = document.createElement("button");
    b.className = "tab" + (state.tab === cat ? " active" : "");
    b.textContent = cat;
    b.onclick = () => {
      state.tab = cat;
      renderTabs();
      renderProducts();
    };
    tabs.appendChild(b);
  });
}

function renderProducts() {
  const list = $("#productList");
  list.innerHTML = "";

  db.products
    .filter((p) => p.category === state.tab)
    .forEach((p) => {
      const row = document.createElement("button");
      row.className = "item";
      row.innerHTML = `
        <div class="name">${p.name}</div>
        <div class="meta">${p.stock == null ? "" : "Lager: " + p.stock}</div>
        <div class="price"><strong>${NOK(p.price)}</strong></div>
      `;
      row.onclick = () => addLine(p);
      list.appendChild(row);
    });
}

function addLine(p) {
  const l = state.lines.find((x) => x.id === p.id);
  if (l) l.qty += 1;
  else state.lines.push({ id: p.id, name: p.name, unit_price: p.price, qty: 1 });
  renderLines();
}

function changeQty(id, delta) {
  const l = state.lines.find((x) => x.id === id);
  if (!l) return;
  l.qty += delta;
  if (l.qty <= 0) {
    state.lines = state.lines.filter((x) => x.id !== id);
  }
  renderLines();
}

function renderLines() {
  const cont = $("#lines");
  cont.innerHTML = "";
  let sum = 0;

  state.lines.forEach((l) => {
    const lineSum = Number(l.unit_price) * l.qty;
    sum += lineSum;
    const div = document.createElement("div");
    div.className = "line";
    div.innerHTML = `
      <div><strong>${l.name}</strong></div>
      <div class="qty">
        <button class="btn subtle" data-dec="${l.id}">−</button>
        <span>${l.qty}</span>
        <button class="btn" data-inc="${l.id}">+</button>
      </div>
      <div><strong>${NOK(lineSum)}</strong></div>
    `;
    cont.appendChild(div);
  });

  $("#sumNok").textContent = NOK(sum);

  $$("[data-dec]").forEach(
    (b) => (b.onclick = () => changeQty(b.dataset.dec, -1))
  );
  $$("[data-inc]").forEach(
    (b) => (b.onclick = () => changeQty(b.dataset.inc, 1))
  );
}

// ============ PAYMENT ============

async function doPay(method) {
  if (state.lines.length === 0) {
    alert("Ingen varer valgt.");
    return;
  }

  const items = state.lines.map((l) => ({
    product_id: l.id,
    name: l.name,
    unit_price: l.unit_price,
    qty: l.qty,
  }));

  await api("/api/sales", {
    method: "POST",
    body: JSON.stringify({ items, payment_method: method }),
  });

  alert(`Betaling via ${method} registrert!`);

  state.lines = [];
  renderLines();
}

async function showToday() {
  const r = await api("/api/stats");
  const box = $("#reportBox");
  box.hidden = false;
  box.innerHTML = `
    <div><strong>Dagens dato:</strong> ${r.date}</div>
    <div><strong>Antall salg:</strong> ${r.count_sales}</div>
    <div><strong>Total omsetning:</strong> ${NOK(r.total)}</div>
  `;
}

function wirePos() {
  $("#clearBtn").onclick = () => {
    state.lines = [];
    renderLines();
  };

  $$(".pay .btn").forEach(
    (b) => (b.onclick = () => doPay(b.dataset.pay))
  );

  $("#todayReport").onclick = showToday;
}

// ============ START APP ============

(async function start() {
  await loadProducts();
  renderTabs();
  renderProducts();
  renderLines();
  wirePos();
})();
