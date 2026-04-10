

# Administrator-Student Account Management System

## Overview

Administrators (agents with Manager Add-on) can invite students and get full access to their folders and assignments. An admin can manage unlimited students from a dedicated dashboard.

## Data Model

**New table: `managed_students`**
```text
id          UUID PK
admin_id    UUID (references auth.users)
student_id  UUID (references auth.users, nullable — filled on accept)
invite_email TEXT NOT NULL
status      TEXT DEFAULT 'pending' (pending | accepted | revoked)
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

RLS policies:
- Admins can SELECT/INSERT/UPDATE/DELETE their own rows (WHERE admin_id = auth.uid())
- Students can SELECT rows where student_id = auth.uid()
- Students can UPDATE (accept invite) where invite_email matches their email

**New DB function: `is_admin_of(admin_uid, student_uid)`** — SECURITY DEFINER, used in RLS policies on `assignments` and `folders` to allow admin access without recursion.

**Updated RLS on `assignments` and `folders`:**
- Add SELECT/UPDATE/DELETE policies: `auth.uid() = user_id OR is_admin_of(auth.uid(), user_id)`
- This gives admins full access to their students' data

## Flow

```text
Admin clicks "Add Student" → enters student email
  │
  ├─► Row created in managed_students (status: pending)
  ├─► Transactional email sent to student with invite link
  │
  Student logs in → sees pending invite banner
  │
  ├─► Clicks "Accept" → status changes to accepted, student_id filled
  │
  Admin dashboard now shows student's folders & assignments
```

## UI Changes

### A. New page: `AdminStudents.tsx` (`/admin/students`)
- List of managed students (name, email, status, date added)
- "Add Student" button → dialog with email input
- Click a student → navigate to their Library view (filtered)
- Revoke access button per student

### B. Student invite banner (`InviteBanner.tsx`)
- Shown at top of Dashboard when student has a pending invite
- "Admin X wants to manage your account" → Accept / Decline buttons

### C. Library page update
- When admin views a student's library, show breadcrumb: "Students > [Name] > Library"
- Admin can switch between their own library and student libraries

### D. Sidebar update
- Add "Students" nav item (only visible for users with `has_manager_addon = true`)
- Icon: Users

### E. AssignmentEditor access
- Already protected by RLS — once policies are updated, admin can view student assignments via direct URL
- Add "Managed by [Admin Name]" badge when student views their own assignment that's being managed

## Files to Create/Modify

| File | Change |
|------|--------|
| Migration SQL | New `managed_students` table, `is_admin_of()` function, updated RLS on assignments + folders |
| `src/pages/AdminStudents.tsx` | **New** — student management dashboard for admins |
| `src/components/InviteBanner.tsx` | **New** — pending invite banner for students |
| `src/pages/AssignmentsLibrary.tsx` | Support viewing a specific student's library (via query param or route) |
| `src/components/AppSidebar.tsx` | Add "Students" nav item for manager addon users |
| `src/App.tsx` | Add `/admin/students` route |
| `src/pages/Dashboard.tsx` | Show InviteBanner for pending invites |
| `supabase/functions/send-transactional-email` | Add invite email template |
| Email template | **New** `student-invite.tsx` template |

## Security

- `is_admin_of()` is SECURITY DEFINER to avoid RLS recursion
- Students must explicitly accept invites — no silent access
- Admin can only access students who accepted their invite
- Revoking access immediately removes all RLS grants

