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
