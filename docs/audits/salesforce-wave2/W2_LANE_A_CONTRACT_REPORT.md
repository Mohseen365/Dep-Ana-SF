# Wave 2 Lane A — Schema, DTOs, and Contract Authority Report

**Date:** October 2026
**Context:** Wave 2 Contract Publication
**Author / Agent:** Jules Coordinator & Lead Integrator (Lane A)

---

## 1. Executive Summary

Lane A established the canonical schema definitions and Apex DTO data contracts for the Wave 2 Salesforce POC in `scratch/salesforce-poc/`.

All custom object definitions follow the `DA_*` prefix naming map recommended in Decision Register `DEC-03`.

---

## 2. Deliverables & Artifact Inventory

### 2.1 Custom Object Metadata
* `DA_Project__c/DA_Project__c.object-meta.xml` (ReadWrite sharing model)
* `DA_Project__c/fields/Project_Key__c.field-meta.xml` (Unique external ID)
* `DA_Analysis_Run__c/DA_Analysis_Run__c.object-meta.xml` (ControlledByParent)
* `DA_Analysis_Run__c/fields/DA_Project__c.field-meta.xml` (MasterDetail)
* `DA_Graph_Chunk__c/DA_Graph_Chunk__c.object-meta.xml` (ControlledByParent)
* `DA_Graph_Chunk__c/fields/DA_Analysis_Run__c.field-meta.xml` (MasterDetail)
* `DA_Graph_Chunk__c/fields/Chunk_Index__c.field-meta.xml` (Number, Precision 6)
* `DA_Graph_Chunk__c/fields/Payload_Data__c.field-meta.xml` (LongTextArea)
* `DA_Finding__c/DA_Finding__c.object-meta.xml` (ControlledByParent)
* `DA_Annotation__c/DA_Annotation__c.object-meta.xml` (ControlledByParent)
* `DA_User_Preference__c/DA_User_Preference__c.object-meta.xml` (Private)

### 2.2 Apex DTO Data Contracts
* `classes/dto/DAGraphDTO.cls` & `-meta.xml`: Transfer object for graph metadata, small payloads, and chunk arrays.
* `classes/dto/DAErrorResponse.cls` & `-meta.xml`: Standard error response envelope with code, message, details, and timestamp.

---

## 3. Security & Multi-Tenant Rules

1. `DA_Project__c` serves as the multi-tenant isolation root.
2. Dependent records (`DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Finding__c`, `DA_Annotation__c`) inherit parent project sharing via `MasterDetail` relationships (`ControlledByParent`).
3. `DA_User_Preference__c` is `Private` to restrict preference access strictly to record owners.
