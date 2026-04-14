

# Fix Table Rendering in Assignment Editor

## Problem
The AI generates markdown tables (with `|` pipe syntax), but the `markdownToHtml` converter in TipTapEditor doesn't parse table syntax. Tables render as raw text with pipes instead of formatted HTML tables. TipTap also lacks table extension support.

## Solution

### 1. Add TipTap Table extensions
Install `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-header`, `@tiptap/extension-table-cell` and register them in the editor.

### 2. Parse markdown tables in `markdownToHtml()`
Add table parsing logic to the `markdownToHtml` function that:
- Detects consecutive lines starting with `|`
- Skips the separator row (`|---|---|`)
- Converts header row to `<th>` cells and data rows to `<td>` cells
- Wraps in `<table><thead>...</thead><tbody>...</tbody></table>`

### 3. Convert HTML tables back to markdown in `htmlToMarkdown()`
Add `table`, `thead`, `tbody`, `tr`, `th`, `td` cases to the `processNode` switch so edited tables export back to markdown correctly.

### 4. Style tables
Add basic table styles in the editor CSS scope so tables look clean (borders, padding, header background).

### Files modified
| File | Change |
|------|--------|
| `package.json` | Add 4 TipTap table packages |
| `src/components/editor/TipTapEditor.tsx` | Register table extensions, update `markdownToHtml` and `htmlToMarkdown` to handle tables |
| `src/index.css` | Add table styling for the editor |

