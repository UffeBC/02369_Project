# Marias Bageri project roadmap

Here we use this checklist to keep track of our 21 planned tasks across the three sprints. We keep the task numbers aligned with our status report and backlog.

## How to update this roadmap

- We tick a task when we have reviewed the result and met its acceptance criteria.
- For code tasks, we mark the task complete after the change has been reviewed and merged into `main`.
- We add important decisions and scope changes to the relevant task notes or project report.
- The names below show our current task leads. We still need to assign leads to tasks marked `TBD`.

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

- [x] **10. Production input interface** — Let employees record the quantity produced for each product on a given day. **Lead:** Talha + Azad. **Status:** Complete — the form is merged into `main`, including editing an existing daily quantity.
- [x] **11. Production backend** — Save and retrieve production records through the API; support the agreed MVP rule of one daily total per product. **Lead:** Talha. **Status:** Complete — the production API and daily upsert behavior are merged into `main`.
- [ ] **12. Production testing** — Verify production recording, input validation, and error handling. **Lead:** Talha + Azad. **Status:** In progress — automated API tests are still pending in a feature branch.
- [ ] **13. Sell-out interface** — Let employees mark a product as sold out. **Lead:** Talha. **Status:** In progress — the interface is implemented on a feature branch and is awaiting review and merge.
- [x] **14. Sell-out backend** — Store sell-out events with an automatically recorded timestamp. **Lead:** Azad + Talha. **Status:** Complete — the sell-out API is merged into `main`.
- [x] **15. Sell-out testing** — Verify sell-out recording, timestamps, and handling of incorrect or duplicate entries. **Lead:** Azad + Talha. **Status:** Complete — the isolated API tests are merged into `main`.
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

### 2026-11-19 — Daily production editing merged

- **Status:** Completed
- **Tasks:** 10 and 11
- **Who did what:** Talha implemented and tested PR #9. Azad performed the peer review, after which the team merged it into `main`.
- **What we completed:** PR #9 was reviewed and merged into `main`. Employees can now edit an already recorded production quantity for a product and date. The backend keeps the MVP rule of one total per product per day by updating the existing record.
- **Verification:** The frontend build and lint pass. The backend starts correctly, and `GET /api/products` and `GET /api/production` both return HTTP 200.
- **Evidence:** [PR #9](https://github.com/UffeBC/02369_Project/pull/9), merged commit `a5c0084`.

### 2026-11-19 — Leftover-recording integration follow-up

- **Status:** Pending
- **Who did what:** Mahmoud implemented the leftover-recording branch. Talha checked it against the latest `main` and documented the merge conflict.
- **What we found:** Mahmoud's leftover-recording branch contains the leftover interface, backend routes, and tests, but it conflicts with the latest `frontend/src/App.tsx` after PR #9 was merged.
- **Next action:** Resolve the conflict against the current `main` before opening or merging the leftover-recording pull request.

### 2026-11-19 — Sell-out backend started — Talha

- **Status:** In progress
- **Tasks:** 14 and 15
- **Who did what:** Talha implemented the sell-out model, routes, tests, and documentation. The rest of the team still needs to review the design.
- **What we started:** Added the sell-out record model and `GET`/`POST /api/sellouts` endpoints. The backend records the timestamp automatically and rejects a duplicate sell-out for the same product on the same day.
- **Verification:** `PYTHONPATH=. .venv/bin/pytest -q tests/test_sellouts.py` passed with 3 tests after installing `backend/requirements-dev.txt`. At that stage, review and merge were still pending; the completion note below records the final state.

### 2026-11-19 — Sell-out backend merged — Talha

- **Status:** Completed
- **Tasks:** 14 and 15
- **Who did what:** Talha implemented the sell-out model, routes, duplicate handling, tests, and dependency setup. The team resolved the roadmap conflict and merged the feature into `main`.
- **What we completed:** Employees can record a product sell-out with an automatic timestamp. The API rejects unknown products and duplicate same-day entries.
- **Verification:** Three sell-out API tests pass, the frontend build and lint pass, and PR #11 was merged as commit `ade8bdb`.
- **Evidence:** [PR #11](https://github.com/UffeBC/02369_Project/pull/11).

### 2026-11-19 — Sell-out interface started — Talha

- **Status:** In progress
- **Tasks:** 13
- **Who did what:** Talha implemented the React sell-out list, loading state, duplicate-safe button behavior, and user feedback.
- **What we started:** Employees can load today's sell-out records and mark an available product as sold out. The interface shows completed sell-outs and disables marking for past or future dates.
- **Verification:** The frontend TypeScript build and lint pass. Review and merge are still pending.
