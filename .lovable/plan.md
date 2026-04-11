

# Slide Preview — PowerPoint-quality redesign

## Problem
The current preview looks like a web card, not a real presentation. Thumbnails are plain colored boxes, the main slide canvas is small, and text sizing doesn't match actual PowerPoint proportions.

## Plan

### 1. Full-width modal with proper 16:9 canvas
- Change dialog to `max-w-6xl` (or near full-screen)
- Main slide renders at fixed 16:9 aspect ratio with larger canvas area (~720px wide)
- Dark background behind the canvas (like PowerPoint's dark gray workspace)
- Subtle drop shadow on the slide card for depth

### 2. Better thumbnails
- Increase sidebar width to ~180px
- Each thumbnail renders a true mini-version of the slide (same layout logic, scaled down) instead of just colored boxes with text
- Active thumbnail gets a bold blue border; hover shows subtle lift
- Slide numbers below each thumbnail

### 3. Improved slide rendering
- **Title slides**: Larger title text (text-3xl/4xl), centered layout, accent bar
- **Content/bullet slides**: Proper header bar with title, generous padding, larger body text (text-sm instead of text-xs)
- **Two-column slides**: Better card styling with more padding and readable text
- **Stats slides**: Bigger stat numbers, cleaner cards
- **Quote slides**: Elegant centered layout with large quotation mark
- Remove the `slide.type` debug badge from top-right corner

### 4. Navigation polish
- Slide counter as a pill badge centered below the canvas
- Nav arrows slightly larger, semi-transparent dark circles
- Keyboard navigation (left/right arrow keys)

### 5. Edit bar cleanup
- Move edit controls into a cleaner toolbar strip
- Slide title displayed prominently with inline edit icon

### Files modified
| File | Change |
|------|--------|
| `src/components/editor/SlidePreview.tsx` | Complete visual overhaul — larger modal, dark workspace, better slide rendering, keyboard nav, polished thumbnails |

