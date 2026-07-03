// ============================================================
// webhook.js — Receptor de eventos Hotmart para Claude para Ingenieros
//
// DEPLOY: Sube este archivo a un servidor Node.js (ej. VPS, Railway,
// Render, Vercel Serverless) — NO en Hostinger shared hosting.
//
// CONFIGURACIÓN EN HOTMART:
//   Panel → Ferramentas → Webhooks → URL: https://tu-servidor.com/webhook
//   Método: POST | Tipo de evento: PURCHASE_COMPLETE
//
// VARIABLES DE ENTORNO necesarias:
//   FIREBASE_PROJECT_ID   → tu project ID
//   FIREBASE_CLIENT_EMAIL → service account email
//   FIREBASE_PRIVATE_KEY  → private key del service account (con \n)
//   HOTMART_WEBHOOK_TOKEN → token secreto del webhook (opcional pero recomendado)
//   PORT                  → puerto del servidor (default 3000)
// ============================================================

import http from "http";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ── Inicializar Firebase Admin (una sola vez) ──────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Las variables de entorno escapan \n como \\n — revertir
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    })
  });
}

const db = getFirestore();

// ── Mapeo de productos Hotmart → campo Firestore ───────────────
//
// Cómo identificar el producto en el payload de Hotmart:
//   event.data.product.id  (número entero)
//
// Reemplaza los valores numéricos con los IDs reales de tus productos.
// Los encuentras en: Hotmart → Productos → ID del producto.
//
const PRODUCT_MAP = {
  "7824773": "ingenieros_principal",
  "7888135": "ob1_agentes",
  "7914914": "ob2_normas",
  "7914929": "ob3_estudio",
  "7888071": "ob4_actualizaciones",
  "7888056": "ob5_vitalicio"
};

// Token de verificación (opcional pero recomendado)
const HOTMART_TOKEN = process.env.HOTMART_WEBHOOK_TOKEN || "";

// ─────────────────────────────────────────────────────────────
// SERVIDOR HTTP
// ─────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {

  // Health check
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Webhook activo ✔");
    return;
  }

  // Solo aceptar POST en /webhook
  if (req.method !== "POST" || req.url !== "/webhook") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  // Leer body completo
  let body = "";
  req.on("data", chunk => { body += chunk.toString(); });

  req.on("end", async () => {
    try {
      // ── Verificar token Hotmart si está configurado ──
      if (HOTMART_TOKEN) {
        const incomingToken = req.headers["x-hotmart-webhook-token"] || "";
        if (incomingToken !== HOTMART_TOKEN) {
          console.warn("Token inválido recibido:", incomingToken);
          res.writeHead(401);
          res.end("Unauthorized");
          return;
        }
      }

      const payload = JSON.parse(body);

      // ── Extraer datos del evento Hotmart ──────────────
      // Estructura del payload: https://developers.hotmart.com/docs/pt-BR/webhooks/
      const event      = payload.event;           // "PURCHASE_COMPLETE", etc.
      const data       = payload.data;
      const buyerEmail = data?.buyer?.email?.toLowerCase()?.trim();
      const productId  = String(data?.product?.id || "");

      if (!buyerEmail || !productId) {
        console.warn("Payload incompleto:", { buyerEmail, productId });
        res.writeHead(400);
        res.end("Bad request — missing buyer email or product id");
        return;
      }

      // Solo procesar compras aprobadas
      if (event !== "PURCHASE_APPROVED") {
        res.writeHead(200);
        res.end(`Evento '${event}' ignorado`);
        return;
      }

      // ── Mapear producto → campo Firestore ─────────────
      const campoFirestore = PRODUCT_MAP[productId];

      if (!campoFirestore) {
        console.warn(`Producto desconocido: ${productId}`);
        res.writeHead(200);
        res.end(`Producto ${productId} no mapeado — ignorado`);
        return;
      }

      // ── Escribir en Firestore ──────────────────────────
      const userRef = db.collection("usuarios").doc(buyerEmail);

      await userRef.set(
        {
          email: buyerEmail,
          productos: {
            [campoFirestore]: true
          },
          ultimaActualizacion: FieldValue.serverTimestamp()
        },
        { merge: true }   // crea si no existe, actualiza si existe
      );

      console.log(`✔ Acceso otorgado: ${buyerEmail} → ${campoFirestore}`);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, email: buyerEmail, campo: campoFirestore }));

    } catch (err) {
      console.error("Error procesando webhook:", err);
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Webhook escuchando en puerto ${PORT}`);
});
