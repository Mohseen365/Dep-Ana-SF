# Salesforce Dependency Report

## LWC → Apex

| LWC | Apex | Method |
|---|---|---|

## LWC → LWC

| Parent | Child | Type |
|---|---|---|

## Apex → Apex

| From | To | Type | Method |
|---|---|---|---|
| ApexClass:BouquetOrderController | ApexClass:BouquetOrderFormService | instantiation | submitOrder |
| ApexClass:BouquetOrderController | ApexClass:BouquetOrderFormService | type-reference | submitOrder |
| ApexClass:BouquetOrderFormService | ApexClass:BouquetOrderSelector | method-call | someMethod -> getContactIdByUserId |
| ApexClass:BouquetOrderFormService | ApexClass:HelperService | method-call | secondMethod -> resolve |
| ApexClass:BouquetOrderFormService | ApexClass:MultiCallService | method-call | secondMethod -> firstCall |
| ApexClass:BouquetOrderFormService | ApexClass:MultiCallService | method-call | secondMethod -> secondCall |
| ApexClass:BouquetOrderPageHandler | ApexClass:BouquetOrderController | instantiation | handleRequest |
| ApexClass:BouquetOrderPageHandler | ApexClass:BouquetOrderController | type-reference | handleRequest |
| ApexClass:BouquetOrderSelector | ApexClass:HelperService | method-call | getContactIdByUserId -> resolve |
| ApexClass:BouquetOrderSelector | External:Account | generic-type |  |
| ApexClass:BouquetOrderSelector | External:Contact | generic-type |  |
| ApexClass:CircularA | ApexClass:CircularB | method-call | callB -> callA |
| ApexClass:CircularB | ApexClass:CircularA | method-call | callA -> callB |

## Apex → Salesforce Data

| Apex | Target | Type | Evidence |
|---|---|---|---|
| ApexClass:BouquetOrderSelector | Object:Account | soql-object | SOQL FROM Account |
| ApexClass:BouquetOrderSelector | Object:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetOrderSelector | Object:Case | soql-object | SOQL FROM Case |

## Circular Dependencies

### Cycle 1

- ApexClass:CircularB
- ApexClass:CircularA


## High Risk Components

| Component | Type | Fan-In | Fan-Out | Risk | Reasons |
|---|---|---:|---:|---|---|
