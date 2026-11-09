# Architecture Design: Project Manager (`daProjectManager`)

**Date:** 9 November 2026
**Feature:** Project Lifecycle Management (`ProjectManager.tsx` & `ProjectCreationModal.tsx`)
**Target Salesforce LWC:** `scratch/salesforce-poc/force-app/main/default/lwc/daProjectManager`
**Target Apex Controller:** `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAProjectManagerController.cls`
**Target Apex Service:** `scratch/salesforce-poc/force-app/main/default/classes/services/DAProjectManagerService.cls`

---

## 1. React Architecture Analysis
In `explorer/src/components/ProjectManager.tsx` (850 lines) & `ProjectCreationModal.tsx` (320 lines):
- Manages complete project lifecycle: Create Project, Edit Metadata, Archive Project, Delete Ingested Runs.
- Validates project key uniqueness (e.g. `cst`, `pbim`, `bqc`).

---

## 2. LWC Architecture
- **Component:** `daProjectManager`
- Form modal for Project Name, Project Key (regex validation: `^[a-zA-Z0-9_-]+$`), Repository URL.
- Datatable of all projects with action menus (Edit, Archive, Ingest Run).

---

## 3. Apex Architecture & Service Boundaries
- `createProject(String name, String key, String repoUrl)`
- `archiveProject(Id projectId)`
- Strict CRUD / FLS checks before DML (`Security.stripInaccessible` or `WITH USER_MODE`).

---

## 4. Jest & Apex Testing Approach
- Tests verify key collision errors and duplicate key handling.
- Verify user without delete permissions cannot remove projects.
