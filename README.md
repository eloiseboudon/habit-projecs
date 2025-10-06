# Habit Projects

## Aperçu
Habit Projects est un monorepo qui regroupe une API FastAPI et une application mobile Expo/React Native pour piloter un système de gamification des habitudes. Le backend centralise la logique métier (niveaux, quêtes, progression), tandis que le frontend propose des écrans mobiles complets pour l’authentification, le tableau de bord, la gestion des quêtes et le suivi de progression.【F:backend/app/main.py†L3-L20】【F:frontend/app/index.tsx†L1-L194】【F:frontend/app/progression.tsx†L1-L204】

## Choix techniques
### Backend
* **FastAPI & Uvicorn** pour exposer l’API REST, structurée autour de routeurs dédiés (authentification, tâches, utilisateurs).【F:backend/app/main.py†L3-L20】【F:backend/requirements.txt†L2-L4】
* **SQLAlchemy 2.0** comme ORM et moteur de migrations Alembic pour modéliser les utilisateurs, domaines, quêtes, historiques d’XP et snapshots de progression.【F:backend/app/models.py†L1-L120】【F:backend/README.md†L25-L39】
* **Pydantic v2** pour la validation des schémas d’entrée/sortie et `pydantic-settings` pour charger la configuration (URL de base PostgreSQL, fuseau horaire).【F:backend/requirements.txt†L3-L6】【F:backend/app/config.py†L1-L25】
* **Gestion des sessions SQLAlchemy** encapsulée dans un utilitaire garantissant commit/rollback atomiques.【F:backend/app/database.py†L1-L26】

### Frontend
* **Expo 54 + React Native 0.81** avec Expo Router pour une navigation déclarative entre les écrans (login, dashboard, quêtes, progression).【F:frontend/package.json†L3-L46】【F:frontend/app/index.tsx†L29-L194】
* **Contextes React** pour orchestrer l’état d’authentification et synchroniser les données distantes (dashboard, tâches, progression) avec rafraîchissement automatique après chaque action utilisateur.【F:frontend/context/AuthContext.tsx†L1-L91】【F:frontend/context/HabitDataContext.tsx†L1-L209】
* **UI mobile** basée sur les composants React Native, Expo LinearGradient et les icônes Expo afin d’offrir une expérience cohérente (cartes, listes, boutons CTA).【F:frontend/app/quests/index.tsx†L1-L626】【F:frontend/app/login.tsx†L1-L183】

### Structure du dépôt
* `backend/` – API FastAPI, modèles SQLAlchemy et scripts Alembic (voir README dédié).【F:backend/README.md†L1-L59】
* `frontend/` – Projet Expo avec écrans, composants partagés et typage TypeScript des réponses API.【F:frontend/package.json†L3-L46】【F:frontend/app/index.tsx†L1-L194】
* `frontend/context/` – Hooks de contexte pour l’authentification et les données métiers partagées.【F:frontend/context/HabitDataContext.tsx†L1-L209】

## Fonctionnalités actuelles
### Côté API
* **Authentification** : inscription avec hash SHA-256, connexion avec compatibilité pour mots de passe hérités, création automatique des réglages de domaine à l’enrôlement.【F:backend/app/api/auth.py†L15-L91】
* **Paramétrage utilisateur** : consultation/mise à jour des préférences de domaine, profil (nom, e-mail, fuseau, langue) et listing global des utilisateurs.【F:backend/app/api/users.py†L298-L447】
* **Tableau de bord dynamique** : agrégation hebdomadaire des points et XP par domaine, calcul du niveau actuel et XP restant.【F:backend/app/api/users.py†L455-L560】
* **Gestion des quêtes** : lecture des quêtes actives, création de quêtes personnalisées, bascule de visibilité, activation/désactivation de modèles préconfigurés.【F:backend/app/api/users.py†L562-L968】
* **Historique & progression** : récupération des 20 derniers logs, statistiques hebdomadaires par domaine, badges de séries continues.【F:backend/app/api/users.py†L970-L1057】
* **Journalisation des tâches** : création d’un log attribue XP/points, met à jour le niveau, les séries et les snapshots journaliers/hebdomadaires via un service dédié.【F:backend/app/api/task_logs.py†L1-L24】【F:backend/app/services/task_logs.py†L1-L279】

### Côté application mobile
* **Connexion / inscription** avec validation locale, gestion des erreurs et redirection automatique une fois authentifié.【F:frontend/app/login.tsx†L18-L183】【F:frontend/context/AuthContext.tsx†L25-L91】
* **Dashboard joueur** : affichage de l’avatar, du niveau, de la barre de progression XP et des statistiques par domaine avec rafraîchissement par « pull to refresh ».【F:frontend/app/index.tsx†L29-L194】
* **Gestion des quêtes** : liste filtrée par quêtes visibles, validation en un tap, création guidée de quêtes personnalisées (catégorie, fréquence, occurrences), accès au catalogue et à la personnalisation de visibilité.【F:frontend/app/quests/index.tsx†L1-L626】【F:frontend/context/HabitDataContext.tsx†L128-L205】
* **Suivi de progression** : historique chronologique des actions, synthèse hebdomadaire (points/XP) par domaine, présentation des badges de séries, rafraîchissement manuel.【F:frontend/app/progression.tsx†L1-L204】

## Prise en main rapide
1. **Backend**
   ```bash
   cd backend
   make install
   cp .env.example .env  # renseignez DATABASE_URL
   make run
   ```
   Les commandes Makefile gèrent la création du virtualenv, l’exécution du serveur Uvicorn et les migrations Alembic.【F:backend/README.md†L7-L59】

2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run start
   ```
   Les scripts Expo permettent de lancer l’application sur Android, iOS ou Web via `expo start`.【F:frontend/package.json†L5-L38】

## Aller plus loin
* Configurez `EXPO_PUBLIC_API_URL` pour que l’application mobile pointe vers votre instance FastAPI.【F:frontend/lib/api.ts†L18-L38】
* Les contextes exposent des méthodes utilitaires (`createTask`, `enableTaskTemplate`, `updateTaskVisibility`, etc.) : branchez-les facilement dans de nouveaux écrans ou composants.【F:frontend/context/HabitDataContext.tsx†L128-L205】
* Les services de logs de tâches centralisent l’attribution d’XP et la maintenance des séries – idéal pour ajouter de nouveaux types de récompenses sans dupliquer la logique.【F:backend/app/services/task_logs.py†L200-L279】
