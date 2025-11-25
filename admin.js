// Rockeklubben POS – Admin Panel
const API = "https://rockeklubb-web-backend.onrender.com";

// krev innlogging
if (sessionStorage.getItem("loggedIn") !== "true") {
  window.location.href = "index.html";
}

const $ = (s) => document.querySelector(s);
const NOK = (n) =>
  new Intl.NumberFormat("no-NO", { style: "currency", currency: "NOK" }).format(
    Number(n || 0)
  );

// ---------- PRODUKTER ----------

let products = [];

async function fetchProducts() {
  const res = await fetch(API + "/api/products");
  products = await res.json();
  renderProducts();
}

function renderProducts() {
  const tbody = $("#prodRows");
  tbody.innerHTML = "";

  products.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.category || ""}</td>
      <td>${p.cost_price != null ? NOK(p.cost_price) : "-"}</td>
      <td>${NOK(p.price)}</td>
      <td>${p.stock != null ? p.stock : "-"}</td>
      <td>
        <button class="btn subtle" data-edit="${p.id}">Rediger</button>
        <button class="btn subtle" data-del="${p.id}">Slett</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.onclick = () => {
      const id = Number(btn.dataset.edit);
      const p = products.find((x) => x.id === id);
      if (!p) return;
      fillForm(p);
    };
  });

  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.onclick = async () => {
      const id = Number(btn.dataset.del);
      if (!confirm("Slette produkt?")) return;
      await fetch(API + "/api/products/" + id, { method: "DELETE" });
      await fetchProducts();
      clearForm();
    };
  });
}

function fillForm(p) {
  $("#prodId").value = p.id;
  $("#prodName").value = p.name;
  $("#prodCategory").value = p.category || "Bar";
  $("#prodCost").value = p.cost_price != null ? p.cost_price : "";
  $("#prodPrice").value = p.price;
  $("#prodStock").value = p.stock != null ? p.stock : "";
}

function clearForm() {
  $("#prodId").value = "";
  $("#prodName").value = "";
  $("#prodCategory").value = "Bar";
  $("#prodCost").value = "";
  $("#prodPrice").value = "";
  $("#prodStock").value = "";
}

$("#productForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = $("#prodId").value;
  const payload = {
    name: $("#prodName").value.trim(),
    category: $("#prodCategory").value,
    cost_price: $("#prodCost").value ? Number($("#prodCost").value) : null,
    price: Number($("#prodPrice").value),
    stock: $("#prodStock").value ? Number($("#prodStock").value) : null,
  };

  if (!payload.name || !payload.price) {
    alert("Navn og pris må fylles ut.");
    return;
  }

  if (id) {
    await fetch(API + "/api/products/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } else {
    await fetch(API + "/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  clearForm();
  fetchProducts();
});

$("#newBtn").onclick = clearForm;

// ---------- BRUKERADMIN ----------

async function loadUsers() {
  const res = await fetch(API + "/api/users");
  return res.json();
}

async function renderUsers() {
  const box = document.getElementById("userList");
  const users = await loadUsers();

  box.innerHTML = "";

  users.forEach((u) => {
    const div = document.createElement("div");
    div.style.marginBottom = "8px";

    div.innerHTML = `
      <strong>${u.username}</strong> (${u.role || "ukjent"})
      <button data-del="${u.id}" class="btn subtle" style="margin-left:10px;">Slett</button>
    `;

    box.appendChild(div);
  });

  box.querySelectorAll("[data-del]").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.del;
      if (!confirm("Slette bruker?")) return;
      await fetch(API + "/api/users/" + id, { method: "DELETE" });
      renderUsers();
    };
  });
}

document.getElementById("createUserBtn").onclick = async () => {
  const user = document.getElementById("newUserName").value.trim();
  const pass = document.getElementById("newUserPass").value.trim();
  const role = document.getElementById("newUserRole").value;

  if (!user || !pass) {
    alert("Fyll inn brukernavn og passord.");
    return;
  }

  await fetch(API + "/api/users/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: pass, role }),
  });

  document.getElementById("newUserName").value = "";
  document.getElementById("newUserPass").value = "";

  renderUsers();
};

// ---------- ENDRING AV EKSISTERENDE BRUKER ----------

document.getElementById("updateUserBtn").onclick = async () => {
  const id = document.getElementById("userId").value;
  const username = document.getElementById("newUser").value.trim();
  const password = document.getElementById("newPass").value.trim();

  if (!id || !username) {
    alert("Fyll ut bruker-ID og nytt brukernavn.");
    return;
  }

  const res = await fetch(API + "/api/users/update", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, username, password }),
  });

  const data = await res.json();

  if (data.success) {
    alert("Bruker oppdatert.");
    renderUsers();
  } else {
    alert("Feil: " + (data.error || "ukjent"));
  }
};

// ---------- START ----------

fetchProducts();
renderUsers();
