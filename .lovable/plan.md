

# Admin Panel — View & Manage User Assignments

## What we're building

Add a "View Assignments" action per user in the admin panel. Clicking it opens a panel/dialog showing all assignments for that user, with status, word count, date, and a link to open the assignment in the editor.

## Technical plan

### 1. Edge function: new `get_user_assignments` action

Add a new action to `supabase/functions/admin-data/index.ts`:
- Accepts `{ action: "get_user_assignments", user_id: "..." }`
- Uses service client to query `assignments` table filtered by `user_id`
- Returns `id, title, status, word_count, target_grade, assignment_type, created_at, updated_at`

### 2. Admin Dashboard UI changes (`src/pages/AdminDashboard.tsx`)

- Add a **"View Assignments"** button (FileText icon) next to the existing "Credits" button in each user row
- Clicking it opens a dialog showing that user's assignments in a table:
  - Columns: Title, Type, Grade, Word Count, Status, Created
  - Each row has a "Open" link that navigates to `/assignment/:id`
- Add loading state for the assignments dialog
- Add a delete assignment action (calls a new `delete_assignment` edge function action)

### 3. Edge function: `delete_assignment` action

- Accepts `{ action: "delete_assignment", assignment_id: "..." }`
- Uses service client to delete from `assignments` table
- Returns success/error

### Files modified

| File | Change |
|------|--------|
| `supabase/functions/admin-data/index.ts` | Add `get_user_assignments` and `delete_assignment` actions |
| `src/pages/AdminDashboard.tsx` | Add assignments dialog with table, "View Assignments" button per user row, delete action |

No database migrations needed — uses existing tables via service role in the edge function.

