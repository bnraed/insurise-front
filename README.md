<div align="center">

# 🚗 INSURISE — Frontend

### Interface React 18 — Plateforme d'Assurance Automobile IA

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://github.com/bnraed/insurise-front)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://github.com/bnraed/insurise-front)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://github.com/bnraed/insurise-front)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://github.com/bnraed/insurise-front)

</div>

---

## 📋 Description

Interface React 18 complète pour la plateforme INSURISE. Comprend une interface **ERP agent** et un **portail client mobile-first** avec assistant IA conversationnel INSURIS intégré.

---

## 🛠️ Stack Technique

| Couche | Technologie |
|--------|-------------|
| Framework | React 18.3.1 |
| Langage | TypeScript 5 |
| Build | Vite 5 |
| Styles | Tailwind CSS 3 |
| Icônes | Lucide React |
| HTTP | Axios |
| Temps réel | Socket.IO Client |
| État global | Context API + Hooks |

---

## 📁 Structure

```
src/
├── pages/
│   ├── DashboardPage.tsx      → KPIs + notifications temps réel
│   ├── VehiclesPage.tsx       → Gestion véhicules (pagination)
│   ├── QuotationsPage.tsx     → Devis + calcul prime temps réel
│   ├── ContractsPage.tsx      → Contrats + historique
│   ├── ClaimsPage.tsx         → Sinistres + auto-refresh IA
│   └── UserPortalPage.tsx     → Portail client mobile-first
├── components/
│   ├── InsuriseChat.tsx        → Assistant IA INSURIS (RAG + Sinistre)
│   ├── SubscriptionWizard.tsx  → Wizard souscription 5 étapes
│   └── ui/                     → Modal, Badge, ConfirmDialog
├── hooks/
│   ├── useAppState.tsx         → Context API global
│   └── useSocket.ts            → Socket.IO notifications
├── services/
│   └── api.ts                  → Axios HTTP calls + JWT interceptor
└── types/
    └── index.ts                → TypeScript interfaces
```

---

## 🤖 Assistant IA — InsuriseChat

### Tab 1 — Assistant RAG
- Questions libres sur les packs et garanties
- Contexte client personnalisé — véhicules, contrats, sinistres
- Historique persisté en localStorage par userId
- Effacé automatiquement à la déconnexion

### Tab 2 — Déclaration Sinistre Guidée
```
Clic "Déclarer un sinistre"
    ↓ Sélection véhicule
    ↓ Sélection contrat actif
    ↓ Description libre → Questions Groq
    ↓ DECLARATION_COMPLETE détecté
    ↓ Sinistre créé en DB (CLM-XXXXX)
    ↓ Estimation indemnisation affichée
    ↓ Auto-refresh ClaimsPage
```

---

## 🎨 Interfaces

### Interface Agent (Desktop)
| Page | Fonctionnalité |
|------|---------------|
| Dashboard | KPIs, contrats récents, sinistres, Live Socket.IO |
| Véhicules | CRUD + pagination 10/page + recherche |
| Garanties & Packs | Configuration offres d'assurance |
| Devis | Création + calcul prime temps réel + wizard |
| Contrats | Gestion cycle de vie + historique |
| Sinistres | Traitement + auto-refresh après déclaration IA |

### Portail Client (Mobile-first)
| Onglet | Fonctionnalité |
|--------|---------------|
| Accueil | KPIs personnels + mes véhicules |
| Contrats | Liste + historique des changements |
| Sinistres | Liste + déclaration via IA ou formulaire |
| Profil | Informations personnelles |

---

## 🚀 Démarrage

```bash
# Installation des dépendances
npm install

# Développement — pointe vers EC2 (défaut)
npm run dev

# Développement — pointe vers localhost:8085
set VITE_ENV=local && npm run dev

# Build production
npm run build
```

✅ App sur `http://localhost:5173`

---

## ⚙️ Configuration Vite

```typescript
// vite.config.ts
const BACK_URL = ENV === "local"
  ? "http://localhost:8085"
  : "http://54.87.232.38:8085"

proxy: {
  "/api/chat":     { target: BACK_URL },
  "/api/sinistre": { target: BACK_URL },
  "/api/ai":       { target: BACK_URL },
  "/api":          { target: BACK_URL },
}
```

---

## 🔔 Notifications Temps Réel (Socket.IO)

| Événement | Description |
|-----------|-------------|
| contract:new | Nouveau contrat créé |
| contract:status_changed | Statut contrat modifié |
| claim:new | Nouveau sinistre déclaré |
| claim:status_changed | Statut sinistre modifié |

---

## 👨‍💻 Auteur

**Raed Ben Nasr** — Ingénieur Génie Logiciel, EPI Sousse

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin)](https://www.linkedin.com/in/raed-ben-nasr-a10052251/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=flat&logo=github)](https://github.com/bnraed)
