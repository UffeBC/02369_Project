# Marias Bageri project roadmap

Here we use this checklist to keep track of our 21 planned tasks across the three sprints. We keep the task numbers aligned with our status report and backlog.

## How to update this roadmap

- We tick a task when we have reviewed the result and met its acceptance criteria.
- For code tasks, we mark the task complete after the change has been reviewed and merged into `main`.
- We add important decisions and scope changes to the relevant task notes or project report.
- The names below show our current task allocation. We still need to assign owners to tasks marked `TBD`.

## Sprint 1 — Requirements and foundation

- [ ] **1. Stakeholder requirements** — Interview Marias Bageri and document its current workflow and needs. **Lead:** All
- [ ] **2. User stories and acceptance criteria** — Agree on the user stories and define observable completion criteria for each feature. **Lead:** All
- [ ] **3. Scrum planning** — Create the product backlog, prioritize it, and organize the work into sprints. **Lead:** TBD
- [ ] **4. Software architecture** — Document how the React frontend, FastAPI backend, and SQLite database fit together. **Lead:** Uffe
- [x] **5. GitHub setup** — Set up the shared repository and its frontend, backend, and database structure. **Lead:** Uffe
- [ ] **6. Integration and deployment setup** — Document and verify how the components run together, how integration is checked, and how the application is deployed or started. **Lead:** All
- [ ] **7. Database design** — Agree on the data model needed for products, production, sell-outs, and leftovers. **Lead:** Morten + Talha
- [ ] **8. Database implementation** — Implement and verify persistence for the agreed data model, including a safe approach when the schema changes. **Lead:** Morten
- [ ] **9. Product catalogue** — Add, edit, remove, and retrieve products with appropriate validation. **Lead:** Morten

## Sprint 2 — Daily bakery records

- [ ] **10. Production input interface** — Let employees record the quantity produced for each product on a given day. **Lead:** Talha + Azad
- [ ] **11. Production backend** — Save and retrieve production records through the API; support the agreed MVP rule of one daily total per product. **Lead:** Talha
- [ ] **12. Production testing** — Verify production recording, input validation, and error handling. **Lead:** Talha + Azad
- [ ] **13. Sell-out interface** — Let employees mark a product as sold out. **Lead:** Talha + Mahmoud
- [ ] **14. Sell-out backend** — Store sell-out events with an automatically recorded timestamp. **Lead:** Azad + Talha. **Status:** In progress — the backend slice is implemented on a feature branch and is awaiting review and merge.
- [ ] **15. Sell-out testing** — Verify sell-out recording, timestamps, and handling of incorrect or duplicate entries. **Lead:** Azad + Talha. **Status:** In progress — isolated tests cover timestamps, duplicates, unknown products, and retrieval.
- [ ] **16. Leftover input interface** — Provide a closing-time form for recording remaining product quantities. **Lead:** Mahmoud
- [ ] **17. Leftover backend** — Store and retrieve leftover quantities. **Lead:** Mahmoud
- [ ] **18. Leftover testing** — Verify leftover recording, validation, and database integration. **Lead:** Mahmoud

## Sprint 3 — Insights and validation

- [ ] **19. Statistics backend** — Calculate product statistics comparing production, sell-outs, and leftovers by product and weekday. **Lead:** TBD
- [ ] **20. Dashboard frontend** — Show waste and sell-out patterns using clear graphs and tables. **Lead:** Islam
- [ ] **21. Dashboard testing and validation** — Check calculations against sample data and validate the dashboard with the bakery. **Lead:** Islam

## Decisions and follow-ups

- **Our production MVP:** We record one total quantity per product per day. We can revisit batch-level recording if the bakery workflow requires it.
- **Database schema changes:** Before we merge schema changes that affect existing local databases, we agree on and verify a migration or database reset procedure.

## Progress notes

We add dated notes here when we change scope, ownership, or completion status.
Every dated note includes a **Who did what** line so our individual contributions stay clear.

### 2026-11-19 — Sell-out backend started — Talha

- **Status:** In progress
- **Tasks:** 14 and 15
- **Who did what:** Talha implemented the sell-out model, routes, tests, and documentation. The rest of the team still needs to review the design.
- **What we started:** Added the sell-out record model and `GET`/`POST /api/sellouts` endpoints. The backend records the timestamp automatically and rejects a duplicate sell-out for the same product on the same day.
- **Verification:** `PYTHONPATH=. .venv/bin/pytest -q tests/test_sellouts.py` passes with 3 tests after installing `backend/requirements-dev.txt`. The feature still needs review, merge, and frontend integration before the tasks are complete.
