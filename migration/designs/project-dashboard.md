# Architecture Design: Project Dashboard (`daProjectDashboard`)

**Date:** 9 November 2026
**Feature:** Portfolio Executive Dashboard (`ProjectDashboard.tsx`)
**Target Salesforce LWC:** `scratch/salesforce-poc/force-app/main/default/lwc/daProjectDashboard`
**Target Apex Controller:** `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAProjectDashboardController.cls`
**Target Apex Service:** `scratch/salesforce-poc/force-app/main/default/classes/services/DAProjectDashboardService.cls`
**Target DTO:** `scratch/salesforce-poc/force-app/main/default/classes/dto/DAProjectSummaryDTO.cls`

---

## 1. React Architecture Analysis
In `explorer/src/components/ProjectDashboard.tsx` (620 lines):
- Displays multi-project overview cards: Health Score, Total LOC, Average Density, Open Findings count.
- Renders worst hotspot leaderboard across all analyzed codebases.
- Provides quick-launch links into each project workspace.

---

## 2. LWC Architecture
- **Component:** `daProjectDashboard`
- Uses SLDS summary tiles (`slds-page-header__detail-row`), card grids, and interactive datatables.
- Fires `projectselect` event when an executive clicks a project card.

---

## 3. Apex Architecture & Service Boundaries
- Uses SOQL aggregate queries (`COUNT(Id)`, `SUM(Node_Count__c)`, `AVG(Cyclic_SCC_Count__c)`) across `DA_Analysis_Run__c` grouped by `Project__c`.
- Executes in `WITH USER_MODE` with sharing enforcement.

---

## 4. Jest & Apex Testing Approach
- Apex unit tests verify aggregate math across multi-project test data.
- Jest unit tests verify card grid rendering and zero-project empty states.
