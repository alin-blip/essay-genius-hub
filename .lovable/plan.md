

# Slide Preview → Full PowerPoint-like Editor

## Problem
Current preview is view-only with basic text editing in a bottom panel. Users want to click directly on slide text to edit it inline, add/change images, and have a true PowerPoint editing experience.

## Plan

### 1. Inline text editing on the slide canvas
- Make all text elements in `SlideCanvas` clickable and editable when in edit mode
- Click any text (title, subtitle, bullet, quote, stat label, etc.) → it becomes a `contentEditable` field right on the canvas
- Press Enter or click away to save
- Remove the separate "Edit" button + bottom textarea panel — editing happens directly on the slide

### 2. Click-to-edit image support
- Add an "Add Image" / "Change Image" overlay button on image areas of each slide
- When clicked, show a popover with two options:
  - **Upload image**: file picker that converts to base64 and embeds in slide data
  - **AI Generate**: text prompt input that calls `generate-slide-image` edge function
- For slides without images, show a dashed placeholder area with "+" icon
- Clicking existing images shows replace/remove options

### 3. Add new slide
- "+" button at the bottom of the thumbnail sidebar to add a new blank slide
- Dropdown to pick slide type (Content, Bullets, Quote, Stats, Two Column, etc.)
- New slide is inserted after current slide with placeholder content

### 4. Drag-to-reorder slides
- Thumbnails in the sidebar become draggable
- Visual drag indicator shows insertion point
- Uses simple mousedown/mousemove/mouseup or a lightweight approach

### 5. Right-click context menu on slides
- Right-click a thumbnail → Duplicate / Delete / Move Up / Move Down

### 6. Better toolbar
- Toolbar shows: slide type label, title (editable inline), image button, delete, duplicate
- Export + Close buttons stay in bottom bar

### Files modified
| File | Change |
|------|--------|
| `src/components/editor/SlidePreview.tsx` | Major rewrite: inline editing on canvas, image add/replace/AI-generate, add slide, reorder, context menu |

