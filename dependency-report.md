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
| ApexClass:ClassA | ApexClass:ClassB | method-call | doWork -> doHelp |
| ApexClass:ClassB | ApexClass:ClassA | method-call | doHelp -> doWork |

## Apex → Salesforce Data

| Apex | Target | Type | Evidence |
|---|---|---|---|

## Circular Dependencies

### Cycle 1

- ApexClass:ClassB
- ApexClass:ClassA


## High Risk Components

| Component | Type | Fan-In | Fan-Out | Risk | Reasons |
|---|---|---:|---:|---|---|
