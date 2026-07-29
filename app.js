// ============================================================
// app.js — Lógica de autenticación y área de miembros
// Claude para Ingenieros
// ============================================================

import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Configuración de Orderbumps ──────────────────────────────
const ORDERBUMPS = [
  {
    key: "ob1_agentes",
    nombre: "Paquete 10 Agentes Especializados",
    descripcion: "10 agentes listos para usar en Claude. Gestión, contratos, presupuestos y más.",
    hotmartUrl: "https://pay.hotmart.com/R106176927I",
    coverImg: "https://i.imgur.com/dXXWhQq.jpeg",
    vistaModulos: "viewModulesOB1"
  },
  {
    key: "ob2_normas",
    nombre: "KIT Claude para Normas Técnicas 2026",
    descripcion: "Agente IA + 15 prompts + 5 correos + simulador de impacto por tipo de obra.",
    hotmartUrl: "https://pay.hotmart.com/Q106265015Y",
    coverImg: "https://i.imgur.com/VytblxS.jpeg",
    vistaModulos: "viewModulesOB2"
  },
  {
    key: "ob3_estudio",
    nombre: "Pack Estudio de Ingeniería Rentable",
    descripcion: "Agente IA + 20 prompts + 10 scripts + simulador de honorario + tabla 2026.",
    hotmartUrl: "https://pay.hotmart.com/U106265049G",
    coverImg: "https://i.imgur.com/4Ds3UKT.jpeg",
    vistaModulos: "viewModulesOB3"
  },
  {
    key: "ob4_actualizaciones",
    nombre: "Actualizaciones y Funcionalidades",
    descripcion: "Recibe todas las actualizaciones futuras del kit sin costo adicional.",
    hotmartUrl: "https://pay.hotmart.com/L106176805W",
    coverImg: "https://i.imgur.com/dwSLyk3.jpeg",
    vistaModulos: "viewModulesOB4"
  },
  {
    key: "ob5_vitalicio",
    nombre: "Acceso Vitalicio",
    descripcion: "Paga una vez y accede para siempre. Sin suscripciones, sin renovaciones.",
    hotmartUrl: "https://pay.hotmart.com/Y106176766S",
    coverImg: "https://i.imgur.com/pqa50aB.jpeg",
    vistaModulos: "viewModulesOB5"
  }
];

// ── Configuración de Upsells ─────────────────────────────────
const UPSELLS = [
  {
    key: "upsell1_instalacion",
    nombre: "Instalación Total: Tu Asistente de IA Listo para Trabajar",
    descripcion: "Configuración completa de tu entorno de IA para ingeniería. Todo listo para usar desde el primer día.",
    hotmartUrl: "https://pay.hotmart.com/W106932039N?off=6pvz5ju5&checkoutMode=10",
    coverImg: "https://i.imgur.com/0QihcmA.jpeg",
    bannerImg: "https://i.imgur.com/4pNfjED.jpeg",
    vistaModulos: "viewModulesUpsell1"
  }
  // Agrega aquí upsell2 cuando esté listo
];

// ─────────────────────────────────────────────────────────────
// PÁGINA: LOGIN (index.html)
// ─────────────────────────────────────────────────────────────
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  const emailInput = document.getElementById("emailInput");
  const errorMsg   = document.getElementById("errorMsg");
  const loginBtn   = document.getElementById("loginBtn");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.classList.remove("visible");

    const email = emailInput.value.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      showError();
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Verificando...";

    try {
      const userRef  = doc(db, "usuarios", email);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        if (data.productos?.ingenieros_principal === true) {
          // Gravar último login (silencioso — no bloquea el login)
          updateDoc(userRef, {
            ultimoLogin: serverTimestamp()
          }).catch((err) => console.warn("ultimoLogin no grabado:", err));

          sessionStorage.setItem("cpi_email", email);
          window.location.href = "members.html";
          return;
        }
      }

      showError();
    } catch (err) {
      console.error("Error al verificar acceso:", err);
      showError("Ocurrió un error. Intenta de nuevo en unos momentos.");
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Acceder";
    }
  });

  function showError(msg) {
    if (msg) errorMsg.innerHTML = msg;
    errorMsg.classList.add("visible");
    emailInput.focus();
  }
}

// ─────────────────────────────────────────────────────────────
// PÁGINA: MEMBERS (members.html)
// ─────────────────────────────────────────────────────────────
const storeGrid = document.getElementById("storeGrid");

if (storeGrid) {
  const email = sessionStorage.getItem("cpi_email");

  if (!email) {
    window.location.href = "index.html";
  } else {
    initMembersPage(email);
  }

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    sessionStorage.removeItem("cpi_email");
    window.location.href = "index.html";
  });
}

async function initMembersPage(email) {
  const welcomeEmailEl = document.getElementById("welcomeEmail");
  if (welcomeEmailEl) welcomeEmailEl.textContent = email;

  try {
    const userRef  = doc(db, "usuarios", email);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      sessionStorage.removeItem("cpi_email");
      window.location.href = "index.html";
      return;
    }

    const productos = userSnap.data().productos || {};

    renderStoreCards(productos);
    renderUpsellBanner(productos);

  } catch (err) {
    console.error("Error al cargar datos del usuario:", err);
    storeGrid.innerHTML = `
      <p style="color:var(--gray-400);font-size:0.875rem;">
        No se pudieron cargar los complementos. Recarga la página.
      </p>`;
  }
}

// ── Renderizar cards de OBs en "Tus Productos" / "Potencia tu Kit" ──
function renderStoreCards(productos) {
  storeGrid.innerHTML = "";
  const productosGrid = document.getElementById("productosGrid");

  // ── OBs ──
  ORDERBUMPS.forEach((ob) => {
    const comprado = productos[ob.key] === true;
    const coverHtml = ob.coverImg
      ? `<img src="${ob.coverImg}" alt="Portada ${ob.nombre}" loading="lazy" />`
      : `<span class="cover-icon">🖼️</span>`;

    if (comprado) {
      const actionHtml = ob.vistaModulos
        ? `<button class="btn btn-orange" onclick="mostrarVistaOB('${ob.vistaModulos}')">Ver contenido →</button>`
        : `<a href="#" class="btn btn-orange">Ver contenido →</a>`;

      const card = document.createElement("div");
      card.className = "module-card";
      card.innerHTML = `
        <div class="module-cover">${coverHtml}</div>
        <div class="module-body"><h3>${ob.nombre}</h3>${actionHtml}</div>
      `;
      productosGrid.appendChild(card);
    } else {
      const card = document.createElement("div");
      card.className = "ob-card";
      card.innerHTML = `
        <div class="ob-cover">${coverHtml}</div>
        <div class="ob-body">
          <div class="ob-top">
            <h3>${ob.nombre}</h3>
            <span class="badge badge-locked">🔒 Bloqueado</span>
          </div>
          <p>${ob.descripcion}</p>
          <a href="${ob.hotmartUrl}" class="btn btn-orange" target="_blank" rel="noopener noreferrer">Obtener acceso</a>
        </div>
      `;
      storeGrid.appendChild(card);
    }
  });

  // ── Upsells comprados → aparecem em "Tus Productos" ──
  UPSELLS.forEach((up) => {
    const comprado = productos[up.key] === true;
    if (!comprado) return;

    const coverHtml = `<img src="${up.coverImg}" alt="${up.nombre}" loading="lazy" />`;
    const card = document.createElement("div");
    card.className = "module-card";
    card.innerHTML = `
      <div class="module-cover">${coverHtml}</div>
      <div class="module-body">
        <h3>${up.nombre}</h3>
        <button class="btn btn-orange" onclick="mostrarVistaOB('${up.vistaModulos}')">Ver contenido →</button>
      </div>
    `;
    productosGrid.appendChild(card);
  });

  // Ocultar sección "Potencia tu Kit" si no hay OBs sin comprar
  if (storeGrid.children.length === 0) {
    storeGrid.closest("section").style.display = "none";
  }
}

// ── Renderizar banner carrossel de upsells no comprados ──────
function renderUpsellBanner(productos) {
  const track  = document.getElementById("bannerTrack");
  const banner = document.getElementById("upsellBanner");

  if (!track || !banner) return;

  track.innerHTML = "";

  UPSELLS.forEach((up) => {
    const comprado = productos[up.key] === true;
    if (comprado) return; // si ya compró, no mostrar banner

    const slide = document.createElement("a");
    slide.className = "banner-slide";
    slide.href = up.hotmartUrl;
    slide.target = "_blank";
    slide.rel = "noopener noreferrer";
    slide.innerHTML = `<img src="${up.bannerImg}" alt="${up.nombre}" loading="lazy" />`;
    track.appendChild(slide);
  });

  // Inicializar carrossel solo si hay slides
  if (track.children.length > 0) {
    window.initCarrossel();
  }
}
