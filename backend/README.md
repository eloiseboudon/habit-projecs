# Habit Projects Backend

Cette application backend fournit une API FastAPI connectée à une base PostgreSQL pour gérer les fonctionnalités de gamification décrites dans le MVP.

## Installation

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Créez un fichier `.env` à la racine du dossier `backend/` en vous basant sur `.env.example`.

## Démarrage

```bash
uvicorn app.main:app --reload
```

L'API sera accessible sur http://127.0.0.1:8000.

## Migrations de base de données

Les migrations Alembic sont configurées via le fichier `backend/alembic.ini`.

### Appliquer les migrations

```bash
alembic -c backend/alembic.ini upgrade head
```

### Créer une nouvelle migration

```bash
alembic -c backend/alembic.ini revision --autogenerate -m "Votre message"
```

Assurez-vous que la variable d'environnement `DATABASE_URL` est définie (via votre fichier `.env`) avant d'exécuter les commandes ci-dessus.
