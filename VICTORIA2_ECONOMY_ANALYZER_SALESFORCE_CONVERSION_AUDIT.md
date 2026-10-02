# Salesforce Native Conversion Audit — Victoria 2 Economy Analyzer

**Audit Author:** Senior Salesforce Enterprise Architect, Modernization & Apex/LWC Specialist
**Target Platform:** Salesforce Enterprise / Unlimited Edition (Lightning Web Components, Apex, Custom Objects & Relationships)
**Source System:** Victoria 2 Save Game Economy Analyzer (`org.victoria2.tools.vic2sgea`)
**Document Status:** Final Architecture & Conversion Blueprint

---

## A. Executive Summary

The **Victoria 2 Economy Analyzer** is a Java/JavaFX desktop application designed to parse, aggregate, and analyze complex macroeconomic and microeconomic data from Paradox Interactive Clausewitz save-game files (`.v2` / Clausewitz text structure). It models multi-level supply-and-demand dynamics, international trade, GDP generation, population demographics, employment/unemployment rates, product pricing, and world market allocation across dozens of nation-states ("Countries"), hundreds of regional provinces ("Provinces"), and dozens of industrial commodities ("Products").

Transforming this desktop tool into a **Salesforce-native application** is not a literal, line-by-line code translation. Salesforce is a multi-tenant, cloud-based relational platform governed by strict execution limits (CPU, heap, SOQL queries, DML statements). The objective of this architecture audit is to **preserve 100% of the mathematical and economic domain semantics** of the Victoria 2 economy while redesigning the data persistence, asynchronous processing pipeline, service layer, and Lightning user experience (UX) to leverage native Salesforce platform capabilities.

### Key Architectural Decisions Summary

1. **Multi-Snapshot Historical Analysis Model:**
   Economic metrics (GDP, inflation, trade volumes, prices, demand) fluctuate dynamically per save game (point in time). The Salesforce data model decouples static master metadata (`Country__c`, `Product__c`, `Province__c`) from point-in-time economic snapshots (`Economy_Analysis__c`, `Country_Economy__c`, `Product_Economy__c`, `Country_Product_Economy__c`, `Province_Economy__c`). This allows side-by-side comparison of historical save games over time.

2. **Decoupled Asynchronous Import Pipeline:**
   Parsing uncompressed Clausewitz save-game files (often 20 MB – 100 MB+ text files) in synchronous Apex will exceed the 12 MB heap limit and 10-second CPU limit. The recommended architecture processes save files via a **hybrid off-heap / asynchronous pipeline**:
   - *Option A (Native Salesforce Apex/Batch):* File chunking via `ContentVersion` into a Queueable / Batch Apex chain for smaller/compressed files.
   - *Option B (Recommended Enterprise Pattern):* An external Heroku / AWS Lambda / MuleSoft microservice parses the raw Clausewitz text into normalized JSON/CSV payloads and ingests them into Salesforce via REST API / Composite Graph API.

3. **Enterprise Apex Architecture:**
   Strict separation of concerns following standard enterprise patterns (FFLIB / Apex Enterprise Patterns):
   - **Controllers (`@AuraEnabled`):** Thin facade returning strongly-typed DTO wrappers to LWCs.
   - **Services:** Pure business logic (`EconomyAnalysisService`, `EconomyCalculationEngine`).
   - **Selectors:** Centralized SOQL queries respecting Security / FLS (`CountrySelector`, `ProductSelector`).
   - **Domain Layers:** Object behavior validation and encapsulation (`CountryDomain`).

4. **Salesforce Lightning User Experience:**
   Replaces JavaFX desktop windows (`WindowController`, `ChartsController`) with native Lightning App Pages, utility bars, responsive dashboards (`lightning-card`, `lightning-datatable`, `lightning-tabset`), and Chart.js / LWC visualization components bound to LDS and Apex DTOs.

---

## B. Existing Architecture

The existing Java application is organized into eight primary Java packages:

```text
org.victoria2.tools.vic2sgea
├── eug.parser / shared / specific    <-- Clausewitz syntax scanner and tree parser
├── entities                          <-- Domain entities (Country, Product, ProductStorage, Province, EconomySubject)
├── main                              <-- Application entry point (Main) & Save Game Orchestrator (Vic2SaveGameCustom)
├── gui                               <-- JavaFX controllers (CountryController, ProductController, ChartsController, etc.)
├── export                            <-- CSV export utilities (CsvExporter, ExportUtils)
└── watcher                           <-- File watcher for real-time save updates (Watch, WatcherManager, WorldState)
```

### Functional Inventory Matrix

| Source Class | Responsibility | Inputs | Outputs | State | Calculations | Persistence | UI Dependency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Country` | Models national economy & demographics | Raw Clausewitz node, `ProductStorage` map | Aggregated economic metrics | Stateful per load | Population, workforce, employment, GDP, GDP rank, imports, exports | Save Game File | JavaFX `CountryController` |
| `Product` | Models world market commodity | Commodity definition node, price data | Prices, global demand, overproduction | Stateful | World supply/demand, price trends, inflation, overproduction | Save Game File / Rules file | JavaFX `ProductController`, `ProductListController` |
| `ProductStorage` | Junction between Country and Product | Domestic production, stockpiles, trade | Domestic supply, bought/sold qty, GDP contribution | Stateful | Domestic sales, import/export monetary values, max demand | Save Game File | JavaFX `CountryController`, `ChartsController` |
| `EconomySubject` | Base abstraction for economic entities | Node properties | Economic identifiers | Immutable/Stateful | Common identifier parsing | Save Game File | None |
| `Province` | Models regional territory & population | Province save node | Population, POP types, RGO output | Stateful | Regional POP aggregations, RGO production | Save Game File | JavaFX `CountryController` |
| `Report` | Global world market & economy aggregator | List of `Country`, List of `Product` | World totals, Rankings, Inflation | Stateful | Global GDP, world market pool allocations, GDP share | In-Memory runtime | JavaFX `ChartsController`, `WindowController` |
| `ReportHelpers` | Helper functions for report creation | Economic lists | Sorted rankings & percentages | Stateless | Sorting, percentages | In-Memory runtime | JavaFX GUI |
| `Vic2SaveGameCustom` | Main parser/orchestrator | File handle / Path | Populated object graph | Stateful during load | Coordinates `eug` parser with domain entities | File System | `Main` / JavaFX |
| `CountryController` | JavaFX Country view controller | User events, selected `Country` | JavaFX UI nodes (tables, labels) | Stateful (UI) | Formats numeric values for labels | None | JavaFX FXML |
| `ProductController` | JavaFX Product view controller | User events, selected `Product` | JavaFX UI nodes | Stateful (UI) | Formats commodity metrics | None | JavaFX FXML |
| `ChartsController` | JavaFX Pie Chart controller | `Report`, `Country`, `Product` | JavaFX `PieChart` nodes | Stateful (UI) | Pie slice percentage calculations | None | JavaFX FXML |
| `Watch` / `WatcherManager` | File system watcher for save updates | File path | Change triggers | Stateful | Detects file modification timestamp | System IO | `WatchersController` |
| `CsvExporter` | CSV file generator | `Report`, `Country` lists | Exported `.csv` file | Stateless | Formats CSV string data | File System | `ExportController` |

---

## C. Domain Model Extraction

### 1. Domain Entities & Value Objects

1. **`Country` (Domain Entity):** Represents a sovereign state or nation-tag (e.g., `ENG`, `USA`, `FRA`). Contains demographic attributes (total population, workforce, employed, unemployed) and aggregate economic totals (GDP, GDP per capita, GDP rank, total imports, total exports, total domestic supply, total consumption, gold income).
2. **`Product` (Domain Entity):** Represents an economic commodity (e.g., `grain`, `iron`, `small_arms`, `clipper_convoys`). Contains global pricing parameters (current price, base price, min price, max price), market demand (total demand, max demand), world supply (world market pool, actual supply), and global monetary indices (inflation, overproduction percentage, trend).
3. **`ProductStorage` (Junction Value Object / Domain Entity):** Represents a nation's interaction with a specific product. Stores domestic production, bought quantity from world market, sold quantity to world market, stockpiles, domestic sales, import value, export value, and GDP contribution.
4. **`Province` (Domain Entity):** Represents a physical geographic region owned by a country. Stores population breakdown, worker types (farmers, craftsmen, capitalists, laborers), RGO (Resource Gathering Operation) outputs, and factory allocations.
5. **`EconomySubject` (Abstract Superclass):** Serves as a polymorphic base class in Java providing shared properties (`id`, `name`). **Salesforce Recommendation:** Disappear as a database object; replace with pure Apex interfaces or abstract base classes if needed, or absorb into SObjects.

---

## D. Calculation Inventory & Legacy Formula Audit

This section documents every critical legacy formula, its exact source class, division-by-zero safeguards, unit precision, and recommended Salesforce execution location.

### Calculation Matrix

| Calculation Name | Source Method / Class | Legacy Mathematical Formula | Division-By-Zero Risk & Safeguard | SF Execution Location | Persist in DB? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ProductStorage Inner Calcs** | `ProductStorage.innerCalculations()` | `importValue = bought * product.price`<br>`exportValue = sold * product.price`<br>`domesticSales = (supply - sold) * product.price`<br>`gdpContrib = domesticSales + exportValue` | Price = 0 or null. Check `price != null ? price : 0`. | Apex Service Layer | Yes (`Country_Product_Economy__c`) |
| **Country GDP Part** | `Country.calcGdpPart()` | `gdpPart = sum(ProductStorage.gdpContrib) + goldIncome` | ProductStorage list is empty. Default `0.0`. | Apex Service / Roll-Up Summary | Yes (`Country_Economy__c.GDP__c`) |
| **Country Demographics** | `Country.innerCalculations()` | `unemploymentRate = (workforce - employment) / workforce`<br>`gdpPerCapita = (gdp / population) * 100000` | `workforce == 0` or `population == 0`. Wrap in null/zero check. | Apex Service / Formula Field | Formula for Capita / Apex for Rate |
| **Global Report Totals** | `Report.countTotals()` | `worldGdp = sum(Country.gdp)`<br>`worldImports = sum(Country.imports)`<br>`worldExports = sum(Country.exports)` | Empty country list. Return `0`. | Apex Service / Roll-Up | Yes (`Economy_Analysis__c`) |
| **GDP Share** | `ReportHelpers.calcGdpShare()` | `gdpShare = (country.gdp / worldGdp) * 100` | `worldGdp == 0`. Default `0.0%`. | Apex / Formula Field | Yes (`Country_Economy__c.GDP_Share__c`) |
| **Product Overproduction** | `Product.innerCalculations()` | `overproduction = ((actualSupply - maxDemand) / maxDemand) * 100` | `maxDemand == 0`. Default `0.0%`. | Apex Service | Yes (`Product_Economy__c.Overproduction__c`) |
| **Product Inflation** | `Product.innerCalculations()` | `inflation = ((price - basePrice) / basePrice) * 100` | `basePrice == 0`. Default `0.0%`. | Apex Service / Formula | Formula Field |

### Legacy Assumptions, Implementation Quirks & Risks

1. **GDP Scaling Multiplier (`100,000`):** In `Country.innerCalculations()`, GDP per capita is calculated as `(gdp / population) * 100000`. In Victoria 2, population represents total pops (where 1 POP unit = 4 people, or raw integer counts). The `100000` multiplier is a visual scaling factor to display per-capita GDP in readable pounds per 100k citizens. **Preservation Rule:** Keep this exact scaling factor in Apex/Formula fields so numbers match original game reports.
2. **Precious Metals / Gold Special Handling:** Gold (precious metals) does not pass through the standard world market pool. Its output directly converts into national fiat treasury income (`goldIncome`). It must be explicitly added to `Country.calcGdpPart()`.
3. **World Market Allocation Order:** Victoria 2 allocates world market goods based on Country Great Power (GP) rank. The Java application reads raw bought/sold quantities post-allocation from save files rather than simulating the full allocation engine.

---

## E. Salesforce Data Model

To support multi-save historical analysis and preserve performance, the Salesforce data model uses a **Master / Snapshot schema**:

```text
Static Metadata (Global Reference):
  ├── Country__c           (Nation Master Metadata: Tag, Name, Flag)
  ├── Product__c           (Commodity Master Metadata: Code, Category, Base Price)
  └── Province__c          (Geographic Region Master Metadata: ID, Name, State)

Historical Analysis Snapshot (Per Save File Load):
  └── Economy_Analysis__c  (Header: Save File Name, Ingame Date, Analysis Date, Total GDP)
        ├── Country_Economy__c         (Country Snapshot: GDP, Population, Rank, Imports, Exports)
        │     ├── Country_Product_Economy__c  (Junction Snapshot: Domestic Supply, Bought, Sold, GDP)
        │     └── Province_Economy__c         (Province Snapshot: Local Population, RGO Production)
        └── Product_Economy__c         (Product Snapshot: World Price, Demand, Supply, Inflation)
```

### 1. Custom Objects Definition

| Object Label | API Name | Purpose | Record Grain | Parent Object | Relationship Type |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Economy Analysis** | `Economy_Analysis__c` | Represents a single save game analysis snapshot. | 1 record per Save Game import | None | Root Object |
| **Country** | `Country__c` | Master nation reference (e.g. ENG, USA). | 1 record per Nation Tag | None | Master Reference |
| **Country Economy** | `Country_Economy__c` | Economic snapshot of a nation in a save. | 1 record per Country per Analysis | `Economy_Analysis__c` | Master-Detail |
| **Product** | `Product__c` | Master commodity reference (e.g. Iron, Wheat). | 1 record per Commodity | None | Master Reference |
| **Product Economy** | `Product_Economy__c` | World market snapshot of a product. | 1 record per Product per Analysis | `Economy_Analysis__c` | Master-Detail |
| **Country Product Economy** | `Country_Product_Economy__c` | Junction snapshot of country-product interaction. | 1 record per Country + Product per Analysis | `Country_Economy__c` | Master-Detail |
| **Province** | `Province__c` | Master province reference (e.g. London, Paris). | 1 record per Province ID | `Country__c` | Lookup |
| **Province Economy** | `Province_Economy__c` | Regional economic/pop snapshot. | 1 record per Province per Analysis | `Country_Economy__c` | Master-Detail |

---

### 2. Custom Fields Specification

#### Object: `Economy_Analysis__c` (Analysis Header)

| Field Label | API Name | Data Type | Length / Scale | Required | Source | Type | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Analysis Name | `Name` | Text | 80 | Yes | Save Game Name | RAW | e.g. "Prussia_1848_03_12" |
| Ingame Date | `Ingame_Date__c` | Date | - | Yes | Save Game Header | RAW | Game date in save file |
| Analysis Timestamp | `Analysis_Timestamp__c` | DateTime | - | Yes | System Time | RAW | Import execution time |
| Source Save File Name | `Source_Save_File_Name__c` | Text | 255 | No | File Metadata | RAW | Original filename |
| Player Country Tag | `Player_Country_Tag__c` | Text | 10 | No | Save Game Header | RAW | e.g. "PRU" |
| Total World GDP | `Total_World_GDP__c` | Currency | 18, 2 | No | Calculated | AGGREGATED | Roll-Up Summary SUM(`Country_Economy__c.GDP__c`) |
| Total World Population | `Total_World_Population__c` | Number | 18, 0 | No | Calculated | AGGREGATED | Roll-Up Summary SUM(`Country_Economy__c.Population__c`) |
| Total World Imports | `Total_World_Imports__c` | Currency | 18, 2 | No | Calculated | AGGREGATED | Roll-Up Summary SUM(`Country_Economy__c.Total_Imports_Value__c`) |
| Total World Exports | `Total_World_Exports__c` | Currency | 18, 2 | No | Calculated | AGGREGATED | Roll-Up Summary SUM(`Country_Economy__c.Total_Exports_Value__c`) |

---

#### Object: `Country_Economy__c` (Country Economic Snapshot)

| Field Label | API Name | Data Type | Length / Scale | Required | Source | Type | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Economy Analysis | `Economy_Analysis__c` | Master-Detail | - | Yes | System | RAW | Parent Analysis |
| Master Country | `Country__c` | Lookup | - | Yes | System | RAW | Reference to `Country__c` |
| Country Tag | `Country_Tag__c` | Text | 10 | Yes | Save File | RAW | External ID lookup key |
| Population | `Population__c` | Number | 18, 0 | No | Save File | RAW | Total population count |
| Workforce | `Workforce__c` | Number | 18, 0 | No | Save File | RAW | Employable workforce |
| Employment | `Employment__c` | Number | 18, 0 | No | Save File | RAW | Employed count |
| Unemployment Rate | `Unemployment_Rate__c` | Percent | 6, 2 | No | Calculated | DERIVED | Formula: `(Workforce__c - Employment__c) / Workforce__c` |
| GDP | `GDP__c` | Currency | 18, 2 | No | Calculated | DERIVED | Sum of `Country_Product_Economy__c.GDP_Contribution__c` + Gold |
| GDP Rank | `GDP_Rank__c` | Number | 6, 0 | No | Apex Engine | DERIVED | Assigned during report post-processing |
| GDP Share | `GDP_Share__c` | Percent | 6, 4 | No | Calculated | DERIVED | Formula: `GDP__c / Economy_Analysis__r.Total_World_GDP__c` |
| GDP Per Capita | `GDP_Per_Capita__c` | Currency | 18, 2 | No | Calculated | DERIVED | Formula: `(GDP__c / Population__c) * 100000` |
| Total Imports Value | `Total_Imports_Value__c` | Currency | 18, 2 | No | Calculated | AGGREGATED | Roll-Up Summary SUM(`Country_Product_Economy__c.Import_Value__c`) |
| Total Exports Value | `Total_Exports_Value__c` | Currency | 18, 2 | No | Calculated | AGGREGATED | Roll-Up Summary SUM(`Country_Product_Economy__c.Export_Value__c`) |
| Gold Income | `Gold_Income__c` | Currency | 18, 2 | No | Save File | RAW | Direct treasury gold income |
| Unique Snapshot Key | `Unique_Snapshot_Key__c` | Text | 100 | No | System | RAW | Unique External ID: `AnalysisId_Tag` |

---

#### Object: `Product_Economy__c` (Product World Market Snapshot)

| Field Label | API Name | Data Type | Length / Scale | Required | Source | Type | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Economy Analysis | `Economy_Analysis__c` | Master-Detail | - | Yes | System | RAW | Parent Analysis |
| Master Product | `Product__c` | Lookup | - | Yes | System | RAW | Reference to `Product__c` |
| Product Code | `Product_Code__c` | Text | 50 | Yes | Save File | RAW | e.g. "clipper_convoys" |
| Price | `Price__c` | Currency | 12, 4 | Yes | Save File | RAW | World market current price |
| Base Price | `Base_Price__c` | Currency | 12, 4 | No | Master Data | RAW | Commodity base price |
| Inflation Percent | `Inflation_Percent__c` | Percent | 6, 2 | No | Calculated | DERIVED | Formula: `(Price__c - Base_Price__c) / Base_Price__c` |
| Total World Supply | `Total_World_Supply__c` | Number | 18, 4 | No | Save File | RAW | World market pool supply |
| Total World Demand | `Total_World_Demand__c` | Number | 18, 4 | No | Save File | RAW | Global total demand |
| Max Demand | `Max_Demand__c` | Number | 18, 4 | No | Save File | RAW | Global max theoretical demand |
| Overproduction Percent | `Overproduction_Percent__c` | Percent | 6, 2 | No | Calculated | DERIVED | Formula: `(Total_World_Supply__c - Max_Demand__c) / Max_Demand__c` |
| Unique Snapshot Key | `Unique_Snapshot_Key__c` | Text | 100 | No | System | RAW | Unique External ID: `AnalysisId_ProductCode` |

---

#### Object: `Country_Product_Economy__c` (Country-Product Junction Snapshot)

| Field Label | API Name | Data Type | Length / Scale | Required | Source | Type | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Country Economy | `Country_Economy__c` | Master-Detail | - | Yes | System | RAW | Parent Country Snapshot |
| Product Economy | `Product_Economy__c` | Lookup | - | Yes | System | RAW | Reference to Product Snapshot |
| Domestic Supply Qty | `Domestic_Supply_Qty__c` | Number | 18, 4 | No | Save File | RAW | Quantity produced domestically |
| Bought Quantity | `Bought_Quantity__c` | Number | 18, 4 | No | Save File | RAW | Quantity imported from World Market |
| Sold Quantity | `Sold_Quantity__c` | Number | 18, 4 | No | Save File | RAW | Quantity exported to World Market |
| Domestic Sales Qty | `Domestic_Sales_Qty__c` | Number | 18, 4 | No | Calculated | DERIVED | Formula: `Domestic_Supply_Qty__c - Sold_Quantity__c` |
| Import Value | `Import_Value__c` | Currency | 18, 2 | No | Apex Calc | DERIVED | `Bought_Quantity__c * Price` |
| Export Value | `Export_Value__c` | Currency | 18, 2 | No | Apex Calc | DERIVED | `Sold_Quantity__c * Price` |
| Domestic Sales Value | `Domestic_Sales_Value__c` | Currency | 18, 2 | No | Apex Calc | DERIVED | `Domestic_Sales_Qty__c * Price` |
| GDP Contribution | `GDP_Contribution__c` | Currency | 18, 2 | No | Apex Calc | DERIVED | `Domestic_Sales_Value__c + Export_Value__c` |
| Unique Snapshot Key | `Unique_Snapshot_Key__c` | Text | 150 | No | System | RAW | External ID: `CountrySnapshotId_ProductCode` |

---

## F. Relationship Model Justification

1. **`Economy_Analysis__c` → `Country_Economy__c` (Master-Detail):**
   *Justification:* A Country Economy snapshot cannot exist without its parent Analysis record. Cascading delete ensures that deleting a save game snapshot automatically purges all related country metrics. Enables Roll-Up Summary fields on `Economy_Analysis__c` (Total World GDP, Total World Population).
2. **`Economy_Analysis__c` → `Product_Economy__c` (Master-Detail):**
   *Justification:* Product world market metrics are bound to the analysis snapshot lifecycle. Enables Roll-Up Summaries on `Economy_Analysis__c`.
3. **`Country_Economy__c` → `Country_Product_Economy__c` (Master-Detail):**
   *Justification:* Country-Product interactions belong strictly to the Country snapshot. Enables Roll-Up Summaries (`Total_Imports_Value__c`, `Total_Exports_Value__c`) on `Country_Economy__c`.
4. **`Country_Economy__c` → `Country__c` (Lookup):**
   *Justification:* `Country__c` is global master data (e.g. tag `ENG` = "United Kingdom"). Multiple historical analysis snapshots link back to the same master `Country__c` record.
5. **`Product_Economy__c` → `Product__c` (Lookup):**
   *Justification:* Master reference for commodities.

---

## G. Raw vs Derived Data Classification

To maintain high SOQL/DML performance and minimize database storage overhead, derived values are split strictly between **Formula Fields**, **Roll-Up Summaries**, **Apex Engine Calculations**, and **LWC Display-Only Calculations**:

```text
RAW DATA (Persisted from Save File):
  - Ingame Date, File Name, Country Tag, Product Code
  - Raw Population, Workforce, Employment
  - Domestic Production Qty, Bought Qty, Sold Qty
  - Product Market Price, Total World Demand, Total World Supply
  - Direct Gold Treasury Income

DERIVED VIA FORMULA FIELDS (Persisted dynamically without Apex):
  - Unemployment_Rate__c = (Workforce__c - Employment__c) / Workforce__c
  - GDP_Per_Capita__c = (GDP__c / Population__c) * 100000
  - Inflation_Percent__c = (Price__c - Base_Price__c) / Base_Price__c
  - Overproduction_Percent__c = (Total_World_Supply__c - Max_Demand__c) / Max_Demand__c

DERIVED VIA ROLL-UP SUMMARIES (Automatic Engine Calculation):
  - Country_Economy__c.Total_Imports_Value__c = SUM(Country_Product_Economy__c.Import_Value__c)
  - Country_Economy__c.Total_Exports_Value__c = SUM(Country_Product_Economy__c.Export_Value__c)
  - Economy_Analysis__c.Total_World_GDP__c = SUM(Country_Economy__c.GDP__c)

DERIVED VIA APEX CALCULATION ENGINE (Persisted during Import Batch):
  - Import Value, Export Value, Domestic Sales Value, GDP Contribution (requires multiplying Qty by Product Price)
  - Country GDP__c (Sum of GDP Contributions + Gold Income)
  - GDP_Rank__c (Requires global sorting across all countries in the analysis)

DISPLAY-ONLY (Computed in LWC JavaScript for UI):
  - Pie chart percentages (`(country.gdp / totalGdp) * 100`)
  - Delta indicators between two selected save games (Comparison view)
```

---

## H. Apex Architecture

The Apex backend follows **Apex Enterprise Patterns (FFLIB / Separation of Concerns)**:

```text
       ┌─────────────────────────────────────────────────────────┐
       │                   Lightning Web Components              │
       └────────────────────────────┬────────────────────────────┘
                                    │ @AuraEnabled Calls
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │               EconomyAnalysisController                 │
       │  (Controller Layer: Enforces FLS, handles DTO wrapping) │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │                 EconomyAnalysisService                  │
       │     (Service Layer: Transactional orchestrator)         │
       └──────────────┬───────────────────────────┬──────────────┘
                      │                           │
                      ▼                           ▼
       ┌────────────────────────────┐  ┌────────────────────────────┐
       │  EconomyCalculationEngine  │  │   EconomyAnalysisSelector  │
       │ (Domain Calculation Rules) │  │  (Centralized SOQL Query)  │
       └────────────────────────────┘  └────────────────────────────┘
```

### Apex Classes & Responsibilities

1. **`EconomyAnalysisController` (`@AuraEnabled` Facade):**
   - Exposes clean methods to LWC: `getAnalysisSummary(Id analysisId)`, `getCountryList(Id analysisId)`, `getProductList(Id analysisId)`, `getCountryDetails(Id countryEconomyId)`.
   - Delegates all business logic to `EconomyAnalysisService`.
   - Returns strongly-typed DTO wrappers (`CountrySummaryDTO`, `ProductSummaryDTO`).
2. **`EconomyAnalysisService` (Service Layer):**
   - Manages save game analysis lifecycle.
   - Orchestrates multi-object record creation during save import.
   - Triggers post-import economic recalculations and ranking assignments.
3. **`EconomyCalculationEngine` (Domain Calculation Service):**
   - Implements the exact legacy mathematical formulas.
   - Executes GDP ranking algorithms (`AssignGdpRanks(List<Country_Economy__c> countries)`).
   - Computes product trade values and GDP contributions.
4. **`EconomyAnalysisSelector` (Selector Layer):**
   - Enforces `with sharing` and checks `Schema.sObjectType.Country_Economy__c.isAccessible()`.
   - Standardized SOQL query methods with optimized index usage.
5. **`EconomyImportBatch` (Batch / Queueable Apex):**
   - Asynchronous job framework for inserting large record volumes (`Country_Product_Economy__c` junctions) in chunks of 200–2,000 to prevent DML and CPU governor limit exceptions.

---

## I. Apex DTO / Wrapper Design

To prevent returning huge, deeply nested SObject graphs over wire protocols, Apex exposes clean Data Transfer Objects:

```apex
public class CountrySummaryDTO {
    @AuraEnabled public Id countryEconomyId { get; set; }
    @AuraEnabled public String countryTag { get; set; }
    @AuraEnabled public String countryName { get; set; }
    @AuraEnabled public Decimal population { get; set; }
    @AuraEnabled public Decimal gdp { get; set; }
    @AuraEnabled public Decimal gdpPerCapita { get; set; }
    @AuraEnabled public Integer gdpRank { get; set; }
    @AuraEnabled public Decimal gdpShare { get; set; }
    @AuraEnabled public Decimal unemploymentRate { get; set; }
    @AuraEnabled public Decimal totalImports { get; set; }
    @AuraEnabled public Decimal totalExports { get; set; }
}

public class ProductSummaryDTO {
    @AuraEnabled public Id productEconomyId { get; set; }
    @AuraEnabled public String productCode { get; set; }
    @AuraEnabled public String productName { get; set; }
    @AuraEnabled public Decimal price { get; set; }
    @AuraEnabled public Decimal totalWorldSupply { get; set; }
    @AuraEnabled public Decimal totalWorldDemand { get; set; }
    @AuraEnabled public Decimal overproductionPercent { get; set; }
    @AuraEnabled public Decimal inflationPercent { get; set; }
}

public class AnalysisComparisonDTO {
    @AuraEnabled public Id baseAnalysisId { get; set; }
    @AuraEnabled public Id compareAnalysisId { get; set; }
    @AuraEnabled public Decimal baseGdp { get; set; }
    @AuraEnabled public Decimal compareGdp { get; set; }
    @AuraEnabled public Decimal gdpGrowthPercent { get; set; }
}
```

---

## J. JavaFX → Lightning Web Component (LWC) Mapping

| JavaFX Component / View | Current Responsibility | Target Salesforce LWC | LDS / Apex Dependency |
| :--- | :--- | :--- | :--- |
| `WindowController` | Root window layout & navigation | `c-economy-analyzer-shell` | Workspace API / Tabset |
| `Main` | Application initialization & file loading | `c-economy-analysis-header` | LDS (`Economy_Analysis__c`) |
| `CountryController` | Country economic metrics & breakdown | `c-country-dashboard` | `EconomyAnalysisController.getCountryDetails` |
| `ProductController` | Product pricing & world market detail | `c-product-dashboard` | `EconomyAnalysisController.getProductDetails` |
| `ProductListController` | Commodity datatable list view | `c-product-list-view` | `lightning-datatable` / LDS |
| `ChartsController` | Pie chart visualizations (GDP/Trade) | `c-economic-charts-container` | Chart.js LWC library |
| `WatchersController` | Save game file watching status | `c-save-game-watcher-status` | Platform Events / CDC |
| `ExportController` | CSV export modal/dialog | `c-economic-export-modal` | Client-side CSV generator LWC |

---

## K. Import Architecture & Clausewitz EUG Parsing

A raw Victoria 2 save game file is an uncompressed text file ranging from **15 MB to 120 MB**, containing deeply nested Clausewitz bracket syntax (`country_tag = { ... }`).

### Governor Limit Feasibility Analysis for Apex Parsing

- **Apex Heap Limit:** Synchronous = 6 MB, Asynchronous = 12 MB.
- **Apex String Size:** Loading a 30 MB text file into an Apex `String` immediately throws `System.LimitException: Apex heap size too large`.
- **Apex CPU Time Limit:** Synchronous = 10,000 ms, Asynchronous = 60,000 ms. Recursive string parsing of 100k+ lines in Apex easily exceeds 60 seconds.

### Recommended Enterprise Import Architecture (Hybrid Approach)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Option A: Microservice Ingest                    │
│                                                                             │
│  [ Save File ] ──► [ Heroku / AWS Lambda / MuleSoft Parser ]               │
│                                │ (Parses raw Clausewitz text to JSON DTO)   │
│                                ▼                                            │
│                      [ Salesforce Composite REST API ]                      │
│                                │ (Inserts Analysis & Records)               │
│                                ▼                                            │
│                      [ Economy_Analysis__c Records ]                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            Option B: Native Chunked Upload                  │
│                                                                             │
│  [ LWC File Upload ] ──► [ ContentVersion Chunking ]                        │
│                                │                                            │
│                                ▼                                            │
│                      [ Batch Apex Parser Chain ]                            │
│                      (Processes 500 lines per batch chunk)                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Architectural Recommendation:**
- For lightweight/preprocessed save games: **Option B** using a `Batchable` parser reading text lines in bounded chunks.
- For standard production save games (20MB+): **Option A** using an off-heap microservice (Node.js / Java container running the original `eug.parser`) that posts a clean JSON payload directly into Salesforce via the REST API.

---

## L. Security Model

1. **`with sharing` Enforcement:** All Apex Controllers, Services, and Selectors must strictly specify `with sharing` to ensure user security filters are enforced.
2. **CRUD & Field-Level Security (FLS):**
   - Controller methods check `Schema.sObjectType.Country_Economy__c.isAccessible()` and `isCreateable()` prior to execution.
   - Use `Security.stripInaccessible(AccessType.READABLE, queryResults)` on selector SOQL results.
3. **Permission Sets:**
   - **`Economy_Analyzer_User`:** Read-only access to Analysis Snapshots, Country/Product records, and LWC Dashboards.
   - **`Economy_Analyzer_Admin`:** Full Create/Read/Update/Delete access, plus file import permission.

---

## M. Governor Limit Analysis & Scale Mitigation Strategies

| Risk Dimension | Scale Threshold | Potential Limit Exception | Architectural Mitigation |
| :--- | :--- | :--- | :--- |
| **DML Statement Count** | 528 Provinces × 70 Countries = ~36,000 records | `System.LimitException: Too many DML statements: 151` | Bulkify DML insertions into list collections. Max 1-2 DML statements per execution chunk. |
| **Heap Size Limit** | 30 MB Save File text parsing | `System.LimitException: Apex heap size too large` | Off-heap microservice parser or Line-by-Line `Batchable` Apex iterator. |
| **SOQL Query Row Count** | Querying all `Country_Product_Economy__c` across multiple save games | `System.LimitException: Too many query rows: 50001` | Filter SOQL strictly by single `Economy_Analysis__c` ID. Use SOQL `Iterable` in Batch Apex. |
| **CPU Timeout** | Re-sorting 5,000 country/product ranks | `System.LimitException: Maximum CPU time exceeded` | Execute ranking in Batch Apex or perform client-side sorting in LWC `lightning-datatable`. |

---

## N. Java Source → Salesforce Target Complete Mapping Matrix

| Java Source Class | Java Source Package | Target Salesforce Element | Type | Migration Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `Country` | `entities` | `Country__c` / `Country_Economy__c` | Custom Objects | Split into Master (`Country__c`) and Historical Snapshot (`Country_Economy__c`). |
| `Product` | `entities` | `Product__c` / `Product_Economy__c` | Custom Objects | Split into Master (`Product__c`) and Historical Snapshot (`Product_Economy__c`). |
| `ProductStorage` | `entities` | `Country_Product_Economy__c` | Custom Object | Junction snapshot object storing country-product trade & GDP contribution. |
| `Province` | `entities` | `Province__c` / `Province_Economy__c` | Custom Objects | Regional snapshot object linked to `Country_Economy__c`. |
| `EconomySubject` | `entities` | Disappears | None | Polymorphic Java base class replaced by standard SObject fields. |
| `Report` | `entities` | `Economy_Analysis__c` | Custom Object | Save game analysis header storing global totals and rankings. |
| `ReportHelpers` | `entities` | `EconomyCalculationEngine.cls` | Apex Class | Domain calculation utility class. |
| `Vic2SaveGameCustom` | `main` | `EconomyImportService.cls` | Apex Class | Imports parsed JSON payload into Salesforce SObjects. |
| `eug.parser.*` | `eug.parser` | Off-heap Service / `EconomyParser.cls` | External / Apex | Off-heap Clausewitz parser or chunked Apex batch parser. |
| `CountryController` | `gui` | `c-country-dashboard` | LWC | Interactive Lightning Country dashboard with KPI cards and datatables. |
| `ProductController` | `gui` | `c-product-dashboard` | LWC | Interactive Commodity detail view. |
| `ChartsController` | `gui` | `c-economic-charts-container` | LWC | Lightning chart container using Chart.js / SVG donut charts. |
| `ProductListController` | `gui` | `c-product-list-view` | LWC | `lightning-datatable` for commodity list filtering. |
| `WatchersController` | `watcher` | `c-save-game-watcher-status` | LWC | Platform Event listener for automated import status notifications. |
| `CsvExporter` | `export` | `c-economic-export-modal` | LWC | Client-side CSV generator LWC. |

---

## O. Salesforce-Native User Experience (UX) Architecture

The desktop JavaFX windows are replaced with a multi-tabbed, responsive **Salesforce Lightning Workspace Page**:

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Header: [ Economy Analysis: Prussia 1848 Save Game ]  [ Ingame Date: 12/03/1848 ]  [ Switch Save ▼ ] │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │  KPI Summary Cards:                                                                               │ │
│ │  [ World GDP: £14,250,900 ]   [ Global Pop: 420.5M ]   [ Top GP: ENG ]   [ Products Monitored: 48 ] │ │
│ └───────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Tabset: [ 🌐 Global Overview ]  [ 🏛️ Country Explorer ]  [ 📦 Product Market ]  [ 📊 Compare Saves ]│ │
│ ├───────────────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                                   │ │
│ │  Country Explorer View (c-country-dashboard):                                                     │ │
│ │  ┌──────────────────────────────────────────────┐  ┌──────────────────────────────────────────┐  │ │
│ │  │ Select Country: [ PRU - Prussia         ▼ ] │  │ Demographics & Economic KPIs:            │  │ │
│ │  │                                              │  │ Population: 14,820,000                  │  │ │
│ │  │ GDP: £890,400 (Rank #5)                       │  │ Workforce: 3,705,000                    │  │ │
│ │  │ GDP Per Capita: £60.08                       │  │ Unemployment Rate: 4.2%                  │  │ │
│ │  └──────────────────────────────────────────────┘  └──────────────────────────────────────────┘  │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐  │ │
│ │  │ Domestic Production & Product Trade Breakdown (lightning-datatable):                       │  │ │
│ │  │ [ Commodity ]  [ Domestic Supply ]  [ Imports (£) ]  [ Exports (£) ]  [ GDP Contribution (£) ]│  │ │
│ │  │ Small Arms     120.40              £1,200           £4,500           £8,900                 │  │ │
│ │  │ Grain          1,450.00            £0               £12,000          £45,000                │  │ │
│ │  └─────────────────────────────────────────────────────────────────────────────────────────────┘  │ │
│ └───────────────────────────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## P. Testing Strategy

### 1. Apex Unit Test Suite Requirements

- **`EconomyCalculationEngineTest.cls`:**
  - Verify GDP calculation logic across multiple product storage inputs.
  - Test zero-workforce and zero-population edge cases for formula precision.
  - Verify global GDP ranking assignment determinism.
- **`EconomyAnalysisServiceTest.cls`:**
  - Test multi-object insertion and transaction rollback on error.
- **`EconomyAnalysisControllerTest.cls`:**
  - Verify `@AuraEnabled` responses return expected DTO structures.
  - Verify CRUD/FLS accessibility checks throw aura-handled exceptions for unauthorized users.

### 2. LWC Jest Test Suite Requirements

- **`c-country-dashboard.test.js`:**
  - Mock Apex wire adapters (`getCountryDetails`).
  - Verify loading spinner state, error state, and populated data table rendering.
  - Test event propagation when user selects a different country from `lightning-combobox`.

---

## Q. Risks, Unknowns and Mitigation Strategies

1. **Clausewitz Save File Complexity:**
   *Risk:* Save game formatting can vary across Victoria 2 game mods (e.g. HPM, GFM) with custom commodity codes.
   *Mitigation:* Use dynamic schema mapping in `Product__c` master records to auto-create newly discovered commodity codes during import.
2. **Deep Relationship Query Limits:**
   *Risk:* Attempting to query `Country_Economy__c` with all child `Country_Product_Economy__c` records in a single SOQL call can exceed the 10,000 child row limit per query.
   *Mitigation:* Use paginated wire requests or lazy-load product details when a user selects a specific country tab.

---

## R. Recommended Final Architecture Diagram

```text
                               SALESFORCE PLATFORM
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           │                                                         │
   LIGHTNING USER EXPERIENCE                                  DATA MODEL (SOBJECTS)
   ┌───────────────────────┐                                ┌───────────────────────┐
   │ c-country-dashboard   │                                │ Economy_Analysis__c   │
   │ c-product-dashboard   │                                ├───────────────────────┤
   │ c-economic-charts     │                                │ Country_Economy__c    │
   │ c-save-game-watcher   │                                ├───────────────────────┤
   └───────────┬───────────┘                                │ Product_Economy__c    │
               │                                            ├───────────────────────┤
               │ @AuraEnabled Calls                         │ Country_Product_      │
               ▼                                            │   Economy__c          │
   APEX CONTROLLER LAYER                                    └───────────▲───────────┘
   ┌───────────────────────┐                                            │
   │ EconomyAnalysis-      │                                            │
   │   Controller          │                                            │ DML Persist
   └───────────┬───────────┘                                            │
               │                                                        │
               ▼                                                        │
   APEX SERVICE & DOMAIN LAYER                                          │
   ┌───────────────────────┐     ┌────────────────────────┐             │
   │ EconomyAnalysis-      ├────►│ EconomyCalculation-    ├─────────────┤
   │   Service             │     │   Engine               │             │
   └───────────▲───────────┘     └────────────────────────┘             │
               │                                                        │
               │ Ingest JSON DTO                                        │
               │                                                        │
   IMPORT ARCHITECTURE LAYER                                            │
   ┌───────────────────────┐                                            │
   │ EconomyImportService  │◄───────────────────────────────────────────┘
   └───────────▲───────────┘
               │
               │ REST API / Composite Payload
               │
   OFF-HEAP SAVE GAME PARSER (Microservice / Heroku / Lambda)
   ┌────────────────────────────────────────────────────────┐
   │ Clausewitz Save File (.v2) ──► EUG Parser ──► JSON DTO │
   └────────────────────────────────────────────────────────┘
```

---

## S. Phased Implementation Roadmap

1. **Phase 1 — Data Model Setup:** Create Custom Objects (`Economy_Analysis__c`, `Country_Economy__c`, `Product_Economy__c`, `Country_Product_Economy__c`), fields, formulas, roll-up summaries, and External ID unique keys.
2. **Phase 2 — Core Apex Service & Calculation Engine:** Implement `EconomyCalculationEngine.cls`, formula validation, and GDP ranking algorithms with 100% Apex test coverage.
3. **Phase 3 — Data Selectors & DTO Layer:** Build `EconomyAnalysisSelector.cls` and DTO wrapper classes enforcing CRUD/FLS security.
4. **Phase 4 — Import & Integration Pipeline:** Build `EconomyImportService.cls` and REST API endpoints for receiving parsed save-game JSON payloads.
5. **Phase 5 — LWC Country Dashboard:** Develop `c-country-dashboard` with KPI cards, country combobox, and product breakdown datatable.
6. **Phase 6 — LWC Product & Market Dashboard:** Develop `c-product-dashboard` and commodity list views.
7. **Phase 7 — Analytics & Visualizations:** Build `c-economic-charts-container` for rendering GDP/trade donut charts using Chart.js in LWC.
8. **Phase 8 — Security & Hardening:** Enforce `with sharing`, permission sets (`Economy_Analyzer_User`), and governor limit validation.
9. **Phase 9 — End-to-End Testing & Verification:** Execute Apex unit tests, LWC Jest tests, and verify performance under large save-game data volumes.

---

### End of Audit Document
