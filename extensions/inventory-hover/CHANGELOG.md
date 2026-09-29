### 1.2.0

Item numbers are now recognised by the field, not by what the value looks like. No new permissions.

- A lookup runs only on an item number field, such as `ItemId`, `ProductNumber` or `DisplayProductNumber`.
- A product variant's number (`FG001 : : Red : L`) looks up its product master, for example on **Released product variants**.
- Fix: item numbers without a digit, such as `PACK`, and lowercase item numbers now show a tooltip.
- Fix: fields that only contain "item" in their name, such as item group or item name, no longer trigger a lookup.
- Hovering a field's caption ("Item number") shows the item in that field.

### 1.1.1

- Fix: on a fresh install the popup said "no product fields", although the tooltip shows the 20 default fields.
- The popup, settings page and background worker are now blocked from making any network request.

### 1.1.0

- An item with no inventory records still shows its product details.

### 1.0.0

- Product fields in the tooltip: show any released product field above the inventory table, including your own extension fields.
- Color, Size, Style and Version columns appear when the item uses those dimensions.
