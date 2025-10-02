# Habit Projects Backend

Cette application backend fournit une API FastAPI connectée à une base PostgreSQL pour gérer les fonctionnalités de gamification décrites dans le MVP.

## Installation

```bash
cd backend
make install
source .venv/bin/activate  # optionnel : uniquement si vous souhaitez utiliser directement les binaires
```

La cible `make install` crée automatiquement un virtualenv local dans `backend/.venv` et installe les dépendances Python.

Créez un fichier `.env` à la racine du dossier `backend/` en vous basant sur `.env.example`.

## Démarrage

```bash
make -C backend run
```

Toutes les commandes du Makefile utilisent automatiquement l'environnement virtuel `.venv`. L'API sera accessible sur http://127.0.0.1:8000.

## Migrations de base de données

Les migrations Alembic sont configurées via le fichier `backend/alembic.ini`.

### Appliquer les migrations

```bash
make -C backend migrate
```

### Créer une nouvelle migration

```bash
make -C backend revision msg="Votre message"
```

## Commandes Makefile utiles

Toutes les commandes ci-dessus peuvent être exécutées directement depuis le dossier `backend` :

```bash
cd backend
make help
```

Les cibles principales sont :

- `make install` : installe les dépendances Python.
- `make run` : lance l'API FastAPI en mode développement.
- `make migrate` : applique les migrations Alembic.
- `make revision msg="Message"` : génère une nouvelle migration.
- `make check` : compile les modules pour vérifier qu'ils ne contiennent pas d'erreurs de syntaxe.
- `make ensure-venv` : crée l'environnement virtuel local si nécessaire.

Assurez-vous que la variable d'environnement `DATABASE_URL` est définie (via votre fichier `.env`) avant d'exécuter les commandes ci-dessus.
