// ============================================================
// app.js — Lógica de autenticación y área de miembros
// Claude para Ingenieros
// ============================================================

import { db } from "./firebase-config.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Configuración de Orderbumps ──────────────────────────────
const ORDERBUMPS = [
  {
    key: "ob1_agentes",
    nombre: "Paquete 10 Agentes Especializados",
    descripcion: "10 agentes listos para usar en Claude. Gestión, contratos, presupuestos y más.",
    hotmartUrl: "https://pay.hotmart.com/R106176927I",
    coverImg: "https://i.imgur.com/Wo34A3L.jpeg",
    vistaModulos: "viewModulesOB1"
  },
  {
    key: "ob2_normas",
    nombre: "KIT Claude para Normas Técnicas 2026",
    descripcion: "Agente IA + 15 prompts + 5 correos + simulador de impacto por tipo de obra.",
    hotmartUrl: "https://pay.hotmart.com/Q106265015Y",
    // Replace with real cover image path when available
    coverImg: null
  },
  {
    key: "ob3_estudio",
    nombre: "Pack Estudio de Ingeniería Rentable",
    descripcion: "Agente IA + 20 prompts + 10 scripts + simulador de honorario + tabla 2026.",
    hotmartUrl: "https://pay.hotmart.com/U106265049G",
    // Replace with real cover image path when available
    coverImg: null
  },
  {
    key: "ob4_actualizaciones",
    nombre: "Actualizaciones y Funcionalidades",
    descripcion: "Recibe todas las actualizaciones futuras del kit sin costo adicional.",
    hotmartUrl: "https://pay.hotmart.com/L106176805W",
    // Replace with real cover image path when available
    coverImg: null
  },
  {
    key: "ob5_vitalicio",
    nombre: "Acceso Vitalicio",
    descripcion: "Paga una vez y accede para siempre. Sin suscripciones, sin renovaciones.",
    hotmartUrl: "https://pay.hotmart.com/Y106176766S",
    // Replace with real cover image path when available
    coverImg: null
  }
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

    // Estado de carga
    loginBtn.disabled = true;
    loginBtn.textContent = "Verificando...";

    try {
      const userRef  = doc(db, "usuarios", email);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        if (data.produtos?.ingenieros_principal === true) {
          // Guardar email en sessionStorage y redirigir
          sessionStorage.setItem("cpi_email", email);
          window.location.href = "members.html";
          return;
        }
      }

      // Usuario no encontrado o sin acceso principal
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
    if (msg) {
      errorMsg.innerHTML = msg;
    }
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

  // Guardia de acceso: si no hay sesión, volver al login
  if (!email) {
    window.location.href = "index.html";
  } else {
    initMembersPage(email);
  }

  // Botón de logout
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    sessionStorage.removeItem("cpi_email");
    window.location.href = "index.html";
  });
}

async function initMembersPage(email) {
  // Mostrar email en bienvenida
  const welcomeEmailEl = document.getElementById("welcomeEmail");
  if (welcomeEmailEl) {
    welcomeEmailEl.textContent = email;
  }

  try {
    const userRef  = doc(db, "usuarios", email);
    const userSnap = await getDoc(userRef);

    // Si el documento ya no existe (fue eliminado), redirigir al login
    if (!userSnap.exists()) {
      sessionStorage.removeItem("cpi_email");
      window.location.href = "index.html";
      return;
    }

    const productos = userSnap.data().productos || {};

    // Renderizar cards de orderbumps según estado
    renderStoreCards(productos);

  } catch (err) {
    console.error("Error al cargar datos del usuario:", err);
    storeGrid.innerHTML = `
      <p style="color:var(--gray-400);font-size:0.875rem;">
        No se pudieron cargar los complementos. Recarga la página.
      </p>`;
  }
}

function renderStoreCards(productos) {
  storeGrid.innerHTML = "";

  ORDERBUMPS.forEach((ob) => {
    const comprado = productos[ob.key] === true;

    // Portada: imagen real si existe, sino placeholder
    const coverHtml = ob.coverImg
      ? `<img src="${ob.coverImg}" alt="Portada ${ob.nombre}" loading="lazy" />`
      : `<span class="cover-icon">🖼️</span>
         <span class="cover-label">Portada</span>
         <!-- Replace with real cover image -->`;

    // Badge y botón de acción según estado
    const badgeHtml = comprado
      ? `<span class="badge badge-active">✔ Acceso activo</span>`
      : `<span class="badge badge-locked">🔒 Bloqueado</span>`;

    let actionHtml;
    if (comprado) {
      if (ob.vistaModulos) {
        actionHtml = `<button class="btn btn-green" onclick="mostrarVistaOB('${ob.vistaModulos}')">Ir al contenido →</button>`;
      } else {
        actionHtml = `<a href="#" class="btn btn-green" target="_blank" rel="noopener noreferrer">Ir al contenido →</a>`;
      }
    } else {
      actionHtml = `<a href="${ob.hotmartUrl}" class="btn btn-orange" target="_blank" rel="noopener noreferrer">Obtener acceso</a>`;
    }

    const card = document.createElement("div");
    card.className = "ob-card";
    card.innerHTML = `
      <div class="ob-cover">
        ${coverHtml}
      </div>
      <div class="ob-body">
        <div class="ob-top">
          <h3>${ob.nombre}</h3>
          ${badgeHtml}
        </div>
        <p>${ob.descripcion}</p>
        ${actionHtml}
      </div>
    `;

    storeGrid.appendChild(card);
  });
}
