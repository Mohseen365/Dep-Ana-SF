# Architecture Explorer Audit --- Consolidated Wrap-Up

**Prepared:** 2026-10-11\
**Status:** Audit planning consolidated. Phase 1C is narrowly scoped to
two accessibility fixes, with corrected tests required before
implementation. This document does not claim that code changes or tests
have already run.

## 1. Executive Summary

The meta-review loop has reached diminishing returns. The next work
should establish repository evidence and implement only narrowly
authorized changes.

The working model separates: 1. **Defect status** --- is behavior
defective under the intended contract? 2. **Fix status** --- is the
correction sufficiently specified? 3. **Evidence class** --- what
evidence supports the classification?

The current Phase 1C scope contains only: - **1B5-07 --- Missing
form-label association** - **1B5-09 --- Decorative emoji accessibility
treatment**

Their tests must be corrected and shown to fail on the current baseline
for the right reason. Phase 1C.5 is a read-only verification pass for
five bounded source questions. No product decision should be silently
inferred.

## 2. Agreed Working Principles

-   Do not trust labels such as "VERIFIED," "COMPLETE," or "READY"
    without checking the evidence.
-   Separate source evidence, runtime behavior, intended product
    contracts, and proposed fixes.
-   Source-level invariants can be established by source inspection;
    user-visible behavior may require tests or runtime reproduction.
-   A confirmed mechanism does not automatically establish intended
    behavior or prove a proposed fix is correct.
-   Regression tests must fail on the baseline for the right reason and
    pass after the intended fix.
-   Do not mechanically add every variable read by an effect to its
    dependency list; trace update paths and responsibilities.
-   Keep position persistence and analysis-mode exclusivity behind
    explicit product decisions.
-   Verification-only phases must not modify source, tests, or
    configuration.
-   Record tests actually executed separately from tests merely
    proposed.
-   Avoid another meta-review round unless new evidence reveals a
    concrete contradiction.

## 3. Canonical Phase 1B.5 Finding Ledger

These are the working classifications in the supplied audit materials,
not fresh independent repository verification.

  -----------------------------------------------------------------------------------------------------------------
  ID             Finding                          Working status          Required next step   Working severity
  -------------- -------------------------------- ----------------------- -------------------- --------------------
  1B5-01         Rules of Hooks in                Strong source-level     Check whether the    P1 if reachable;
                 `DependencyConstellationPanel`   concern; reachability   parent keeps the     otherwise
                                                  unresolved              panel mounted while  latent/unreachable
                                                                          `focalNode` changes  in that path
                                                                          null → non-null      

  1B5-02         Double-click causes repeated     Source-traced handler   Choose intended      P3
                 handler dispatch                 behavior                click/double-click   
                                                                          behavior; separate   
                                                                          handler count from   
                                                                          render count         

  1B5-03         `||` selection fallback          Candidate               Verify prop contract P3 if contract
                                                                          and callers,         violation
                                                                          especially `''`      established
                                                                          versus               
                                                                          `null`/`undefined`   

  1B5-04         Stale double-tap callback        Candidate               Trace callback       P3 if reachable
                                                                          capture, parent      
                                                                          identity changes,    
                                                                          handler lifecycle,   
                                                                          and ref freshness    

  1B5-05         Element-sync dependencies        Candidate               Trace missing        P2 if stale output
                                                                          dependencies to      demonstrated
                                                                          update paths; decide 
                                                                          whether to split or  
                                                                          expand effects       

  1B5-06         Cross-layout position            Reported source         Verify affected      P2 under working
                 contamination                    mechanism; product      computation; decide  rubric
                                                  semantics unresolved    storage scope;       
                                                                          assess provenance    
                                                                          with storage         

  1B5-07         Missing label association        Source-traced           Add matching         P3
                                                  accessibility concern   `htmlFor`/unique     
                                                                          `id`; validate       
                                                                          focused tests        

  1B5-08         Tablist keyboard navigation      Source-traced concern   Choose correct tab   P3 if contract
                                                                          keyboard pattern or  violation
                                                                          different semantic   established
                                                                          role; verify focus   
                                                                          behavior             

  1B5-09         Decorative emoji accessibility   Source-traced concern   Hide decorative      P4
                                                                          emoji without hiding 
                                                                          meaningful text or   
                                                                          accessible names     

  1B5-10         Connection/Impact exit action    Conditional state-path  Fix both             P3
                 trap                             defect reported         disabled-state logic 
                                                                          and handler          
                                                                          behavior; verify     
                                                                          exit callback runs   

  1B5-11         `GraphSlot` loose `any` types    Internal type-safety    Separate typed       P4
                                                  concern                 cleanup              

  1B5-12         Constellation naming collision   Maintainability concern Rename only after    P4
                                                                          checking references  
                                                                          and contracts        

  1B5-13         Analysis-mode mutual exclusivity Architectural/product   Obtain explicit      Not assigned
                                                  question                product decision     
  -----------------------------------------------------------------------------------------------------------------

### Additional items discussed

  -------------------------------------------------------------------------------------
  Item                               Working status             Treatment
  ---------------------------------- -------------------------- -----------------------
  `parseInt(value, 10) as Depth`     Type-safety smell; runtime Check validation,
                                     defect unproven            bounds, and downstream
                                                                assumptions

  Provenance collapse                Reported concern related   Trace all writers and
  (e.g. `'automatic-hierarchical'`   to 1B5-06                  readers; assess with
  for Orbit/Constellation)                                      position storage

  Error-boundary absence             Candidate, conditional on  Do not call it a defect
                                     reachable errors and       solely because a
                                     resilience requirements    boundary is absent

  Loading-state absence              Unclassified               Trace whether
                                                                transitions are async
                                                                and whether loading
                                                                feedback is required

  `activeInspectId` hover precedence Candidate                  Establish intended
                                                                inspector behavior and
                                                                demonstrate
                                                                wrong-subject behavior

  Optional `onNodePositionsChange`   Contract/maintainability   Determine whether
                                     question                   callers omitting it
                                                                expect persistence

  `GraphControls` toolbar keyboard   Candidate                  Inspect DOM, focus
  navigation                                                    behavior, accessible
                                                                names, and intended
                                                                interaction

  Duplicated `ViewModeSwitcher` JSX  Maintainability concern    Do not treat as
                                                                user-facing without a
                                                                demonstrated
                                                                consequence
  -------------------------------------------------------------------------------------

### Claim-count caveat

Phase 1B.5 reported 21 audited claims. Later lists contain 13 findings,
3 non-findings, and 8 additional discussed items, totaling 24
entries---but not necessarily 24 unique claims because items may
overlap. Do not use a single aggregate count until each claim is mapped
to its original audit source and duplicates are marked. Track unique
findings, repeated claims, non-findings, and additional candidates
separately.

## 4. Narrow Phase 1C Authorization

Only two findings are in scope.

### 4.1 1B5-07 --- Label association

**Intended change:** Add `htmlFor` to relevant labels and matching
unique `id` values to their selects in: - `ConnectionControls.tsx` -
`ImpactControls.tsx`

**Acceptance requirements:** 1. Test both components independently. 2.
Confirm the accessible label resolves to the intended `SELECT`, not just
any matching element. 3. Confirm each `htmlFor` matches the
corresponding select's unique `id`. 4. Demonstrate the baseline failure
is caused by the missing association, not broken test setup. 5. Run the
focused tests after the fix.

Example intent, to be adapted to actual labels and test conventions:

``` tsx
expect(screen.getByLabelText(/Direction/i).tagName).toBe('SELECT');
```

This example alone is not a complete test suite.

### 4.2 1B5-09 --- Decorative emoji

**Intended change:** Add `aria-hidden="true"` to decorative emoji
elements in: - `ConnectionControls.tsx` - `ImpactControls.tsx` -
`GraphControls.tsx`

**Acceptance requirements:** 1. Identify actual decorative emoji
elements in the named components. 2. Verify each decorative element is
hidden from assistive technology. 3. Verify meaningful text, button
names, and useful accessible content remain exposed. 4. Do not rely on a
broad selector such as `document.querySelector('[aria-hidden] span')`;
finding one descendant does not prove every intended emoji is handled.
5. Demonstrate the baseline test fails for the missing treatment and
passes after the correction.

### Phase 1C boundaries

-   Do not implement unrelated findings in this patch.
-   Do not decide position persistence or analysis-mode exclusivity
    here.
-   Do not claim tests passed unless executed.
-   Inspect the final diff to confirm scope stayed narrow.

## 5. Phase 1C.5 --- Read-Only Verification Scope

No source, test, or configuration changes during this phase.

### Check A --- Hook reachability

**Read:** Parent of `DependencyConstellationPanel` and relevant
conditional rendering/mount keys.\
**Question:** Can `focalNode` change null → non-null while the same
instance remains mounted?\
**Output:** Parent rendering conditions, mount/unmount behavior, exact
transition path, and classification. If remounted, classify the reported
path as unreachable---not automatically as a P4 defect.

### Check B --- Layout contamination

**Read:** Relevant paths in `architecture-layout.ts`, including
locations cited by Phase 1B.5.\
**Question:** Does the affected Orbit/Hybrid/Constellation computation
consume `existingPositions` in a way that overrides calculated
positions?\
**Output:** Actual call path, affected modes, read/overwrite behavior,
and a distinguishing minimal input if feasible. Merely reading
`existingPositions` is insufficient.

### Check C --- Position provenance

**Read:** Relevant `captureAndPersistPositions` call sites in
`GraphView.tsx` and readers of provenance.\
**Question:** Is incorrect provenance written for Orbit/Constellation,
and do consumers rely on it?\
**Output:** Writers, readers, intended meaning, and relation to storage.
Treat provenance and coordinate contamination as related but distinct.

### Check D --- Callback lifecycle

**Read:** Parent of `GraphView`, handler initialization, and
callback/ref lifecycle.\
**Question:** Can `onNodeDoubleTap` change after a handler captures it
without that handler receiving the current callback?\
**Output:** Parent callback definition, handler registration,
re-registration behavior, and any ref-based freshness mechanism. A
changing identity alone does not prove a defect.

### Check E --- Selection fallback contract

**Read:** Every caller of `DependencyConstellationPanel` and the prop
type/documentation.\
**Question:** Is `''` a valid explicit clear-selection value, or does
the contract reserve `null`/`undefined` for that purpose?\
**Output:** Caller values, prop type, clear-selection behavior, and
whether `||` violates the contract. Do not change it merely as
speculative future-proofing.

### Phase 1C.5 deliverable

For each check, record: - Finding ID - Source paths and exact line
references - Observed code path - Evidence and limitations - Defect
status - Fix status - Evidence class - Severity rationale or reason it
cannot yet be assigned - Required follow-up

Do not implement fixes in Phase 1C.5.

## 6. Deferred Findings and Product/Design Gates

-   **1B5-02:** Choose intended double-click behavior and test handler
    calls separately from React render counts.
-   **1B5-03:** Verify selection prop semantics.
-   **1B5-05:** Establish effect update paths before choosing
    dependencies or effect boundaries.
-   **1B5-06:** Resolve position-storage scope with the product owner;
    verify provenance separately.
-   **1B5-08:** Decide between implementing the tab keyboard pattern and
    choosing different semantics.
-   **1B5-10:** Specify both state/disabled logic and handler
    correction. If the analysis is enabled but `active` is false and no
    node is selected, clicking the control must actually invoke the exit
    callback.
-   **1B5-11 and 1B5-12:** Keep type and naming cleanup in separate,
    explicitly scoped maintenance work.
-   **1B5-13:** Obtain a product decision on whether analysis modes are
    mutually exclusive.
-   Additional candidates require contract and consequence verification
    before promotion to confirmed defects.

## 7. Severity and Evidence Rules

Apply the working rubric consistently, but do not let priority replace
evidence. Record impact, reachability, recoverability, and scope for
each priority assignment. If the rubric does not map a combination
clearly, state the ambiguity instead of forcing a number.

Use explicit evidence classes: - Source-traced invariant -
Test-reproduced behavior - Runtime/browser-reproduced behavior -
Contract-dependent candidate - Product/design decision required -
Maintainability concern

## 8. Final Integrity Check for Each Phase

Record: - Exact repository revision and branch - Files modified - Files
intentionally not modified - Tests actually executed and results - Tests
proposed but not executed - Baseline failures and whether they failed
for the expected reason - Final diff summary - Unresolved product/design
decisions - Findings reclassified and the evidence responsible

Never infer a clean working tree or unchanged source files without
checking.

## 9. Immediate Next Actions

1.  Correct the Phase 1C label and emoji tests before implementation.
2.  Execute only the two authorized accessibility fixes.
3.  Demonstrate baseline failures for the right reasons and post-fix
    passes.
4.  Run the five read-only Phase 1C.5 checks.
5.  Reclassify findings from evidence rather than from the plan.
6.  Resolve product/design decisions separately.
7.  Authorize subsequent changes only when contract, fix, and acceptance
    test are clear.

**Final status:** Discussion consolidated. Phase 1C is limited to two
accessibility findings, subject to test validation. Phase 1C.5 is
read-only and limited to five source-verification questions. No code
changes or successful test runs are asserted by this wrap-up.
