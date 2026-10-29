# Marias Bageri

Marias Bageri is a course project for Software Processes and Patterns (DTU 02369). The product is being developed for the bakery; the current codebase is an early full-stack foundation with a product list backed by a local database.

## Current functionality

- The web app displays bakery products returned by the backend.
- The API can list, create, and delete products.
- Product records currently contain an ID and a name.
- SQLite tables are created automatically when the backend starts.
- A health endpoint is available for checking that the API is running.

The product-planning and waste-reduction workflows are not implemented in this starter version yet.

## Technology

- **Frontend:** React, TypeScript, and Vite
- **Backend:** Python, FastAPI, and SQLModel
- **Database:** SQLite

## Run on Windows

Install [Node.js](https://nodejs.org/) (including npm) and Python 3, then run `start_marias_bakery.bat` from the project root. The launcher creates a Python virtual environment, installs the dependencies, starts both servers, and opens the app and API documentation.

The launcher keeps the backend and frontend in separate terminal windows. Leave both running while using the app.

## Run manually

Open two terminals from the project root.

In the first terminal, set up and start the backend:

```bash
cd backend
python -m venv .venv
```

Activate the environment (`.venv\\Scripts\\activate` in Windows Command Prompt, `.venv\\Scripts\\Activate.ps1` in PowerShell, or `source .venv/bin/activate` on macOS/Linux), then run:

```bash
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

In the second terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite forwards requests under `/api` to the backend at `http://127.0.0.1:8000`.

## API endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Returns API health status |
| `GET` | `/api/products` | Lists products |
| `POST` | `/api/products` | Creates a product from `{"name": "..."}` |
| `DELETE` | `/api/products/{product_id}` | Deletes a product by ID |

Interactive API documentation is available at <http://127.0.0.1:8000/docs> while the backend is running.

The SQLite database file is `bakery.db` in the backend's working directory and is created automatically on startup.
