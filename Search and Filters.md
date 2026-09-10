Done. Search and filtering has been implemented and verified:

Implemented:

Search — operates on explorer-data.json for component name, file path, type, risk level, and id
Type filter — dropdown populated from unique types in the data
Risk filter — dropdown populated from unique risk levels in the data
Clear/Reset — button appears when filters are active
Search results dropdown — clickable results that center the graph and show details
Behavior:

Search is debounced (150ms) for efficiency
Type and risk filters are applied immediately
Filtering updates the displayed graph without modifying the original analyzer data
Selecting a search result centers the node in the graph and opens the details panel
Tests (55 passing):

Exact search
Partial search
No results
Type filtering
Risk filtering
Combined search + filter
Selecting a result (via onSelectResult callback)
Build and tests pass.