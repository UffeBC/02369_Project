# Marias Bageri project roadmap

Here we use this checklist to keep track of our 21 planned tasks across the three sprints. We keep the task numbers aligned with our status report and backlog.

## How to update this roadmap

- We tick a task when we have reviewed the result and met its acceptance criteria.
- For code tasks, we mark the task complete after the change has been reviewed and merged into `main`.
- We add important decisions and scope changes to the relevant task notes or project report.
- The names below show our current task allocation. We still need to assign owners to tasks marked `TBD`.

## Sprint 1 — Requirements and foundation

- [ ] **1. Stakeholder requirements** — Interview Marias Bageri and document its current workflow and needs. **Owner:** All
- [ ] **2. User stories and acceptance criteria** — Agree on the user stories and define observable completion criteria for each feature. **Owner:** All
- [ ] **3. Scrum planning** — Create the product backlog, prioritize it, and organize the work into sprints. **Owner:** TBD
- [ ] **4. Software architecture** — Document how the React frontend, FastAPI backend, and SQLite database fit together. **Owner:** Uffe
- [x] **5. GitHub setup** — Set up the shared repository and its frontend, backend, and database structure. **Owner:** Uffe
- [ ] **6. Integration and deployment setup** — Document and verify how the components run together, how integration is checked, and how the application is deployed or started. **Owner:** All
- [ ] **7. Database design** — Agree on the data model needed for products, production, sell-outs, and leftovers. **Owner:** Morten + Talha
- [ ] **8. Database implementation** — Implement and verify persistence for the agreed data model, including a safe approach when the schema changes. **Owner:** Morten
- [ ] **9. Product catalogue** — Add, edit, remove, and retrieve products with appropriate validation. **Owner:** Morten

## Sprint 2 — Daily bakery records

- [x] **10. Production input interface** — Let employees record the quantity produced for each product on a given day. **Owner:** Talha + Azad. **Status:** Complete — the form is merged into `main`, including editing an existing daily quantity.
- [x] **11. Production backend** — Save and retrieve production records through the API; support the agreed MVP rule of one daily total per product. **Owner:** Talha. **Status:** Complete — the production API and daily upsert behavior are merged into `main`.
- [ ] **12. Production testing** — Verify production recording, input validation, and error handling. **Owner:** Talha + Azad. **Status:** In progress — automated API tests are still pending in a feature branch.
- [ ] **13. Sell-out interface** — Let employees mark a product as sold out. **Owner:** Talha + Mahmoud
- [ ] **14. Sell-out backend** — Store sell-out events with an automatically recorded timestamp. **Owner:** Azad + Talha
- [ ] **15. Sell-out testing** — Verify sell-out recording, timestamps, and handling of incorrect or duplicate entries. **Owner:** Azad + Talha
- [ ] **16. Leftover input interface** — Provide a closing-time form for recording remaining product quantities. **Owner:** Mahmoud
- [ ] **17. Leftover backend** — Store and retrieve leftover quantities. **Owner:** Mahmoud
- [ ] **18. Leftover testing** — Verify leftover recording, validation, and database integration. **Owner:** Mahmoud

## Sprint 3 — Insights and validation

- [ ] **19. Statistics backend** — Calculate product statistics comparing production, sell-outs, and leftovers by product and weekday. **Owner:** TBD
- [ ] **20. Dashboard frontend** — Show waste and sell-out patterns using clear graphs and tables. **Owner:** Islam
- [ ] **21. Dashboard testing and validation** — Check calculations against sample data and validate the dashboard with the bakery. **Owner:** Islam

## Decisions and follow-ups

- **Our production MVP:** We record one total quantity per product per day. We can revisit batch-level recording if the bakery workflow requires it.
- **Database schema changes:** Before we merge schema changes that affect existing local databases, we agree on and verify a migration or database reset procedure.

## Progress notes

We add dated notes here when we change scope, ownership, or completion status.

### 2026-11-19 — Daily production editing merged

- **Status:** Completed
- **Tasks:** 10 and 11
- **What we completed:** PR #9 was reviewed and merged into `main`. Employees can now edit an already recorded production quantity for a product and date. The backend keeps the MVP rule of one total per product per day by updating the existing record.
- **Verification:** The frontend build and lint pass. The backend starts correctly, and `GET /api/products` and `GET /api/production` both return HTTP 200.
- **Evidence:** [PR #9](https://github.com/UffeBC/02369_Project/pull/9), merged commit `a5c0084`.

### 2026-11-19 — Leftover-recording integration follow-up

- **Status:** Pending
- **What we found:** Mahmoud's leftover-recording branch contains the leftover interface, backend routes, and tests, but it conflicts with the latest `frontend/src/App.tsx` after PR #9 was merged.
- **Next action:** Resolve the conflict against the current `main` before opening or merging the leftover-recording pull request.
