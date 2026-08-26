// ============================================================
// api/webhook.js — Vercel Serverless Function
// Receptor de eventos Hotmart para Claude para Ingenieros
// ============================================================

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ── Inicializar Firebase Admin ────────────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    })
  });
}

const db = getFirestore();

// ── Mapeo de productos Hotmart → campo Firestore ──────────────
const PRODUCT_MAP = {
  "7824773": "ingenieros_principal",
  "7888135": "ob1_agentes",
  "7914914": "ob2_normas",
  "7914929": "ob3_estudio",
  "7888071": "ob4_actualizaciones",
  "7888056": "ob5_vitalicio",
  "8213493": "upsell1_instalacion"
};

// ── Handler principal ─────────────────────────────────────────
export default async function handler(req, res) {

  // Health check
  if (req.method === "GET") {
    return res.status(200).send("Webhook activo ✔");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const payload = req.body;
    const event      = payload.event;
    const data       = payload.data;
    const buyerEmail = data?.buyer?.email?.toLowerCase()?.trim();
    const productId  = String(data?.product?.id || "");

    if (!buyerEmail || !productId) {
      return res.status(400).send("Missing buyer email or product id");
    }

    // Solo procesar compras aprobadas
    if (event !== "PURCHASE_APPROVED") {
      return res.status(200).send(`Evento '${event}' ignorado`);
    }

    const campoFirestore = PRODUCT_MAP[productId];

    if (!campoFirestore) {
      console.warn(`Produto desconocido: ${productId}`);
      return res.status(200).send(`Produto ${productId} não mapeado — ignorado`);
    }

    // Escribir en Firestore
    const userRef = db.collection("usuarios").doc(buyerEmail);

    await userRef.set(
      {
        email: buyerEmail,
        productos: {
          [campoFirestore]: true
        },
        ultimaActualizacion: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    console.log(`✔ Acceso otorgado: ${buyerEmail} → ${campoFirestore}`);

    return res.status(200).json({ ok: true, email: buyerEmail, campo: campoFirestore });

  } catch (err) {
    console.error("Error procesando webhook:", err);
    return res.status(500).send("Internal Server Error");
  }
}
