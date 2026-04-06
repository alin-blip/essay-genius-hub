

## Problem

When a new user signs up and verifies their email, they are redirected to `/dashboard` without going through onboarding first. The onboarding page exists at `/onboarding` but nothing routes new users there.

## Solution

Add onboarding completion detection to redirect users who haven't filled in their academic profile.

### Changes

**1. Update `ProtectedRoute.tsx`** — Check the user's profile after authentication. If `university_level`, `course_name`, or `university` are missing/empty, redirect to `/onboarding` instead of rendering the protected page. Skip this check when already on `/onboarding`.

**2. Update `Login.tsx`** — After successful login, check the profile and navigate to `/onboarding` if incomplete, otherwise `/dashboard`.

**3. Update `Signup.tsx`** — After signup + email verification, the `onAuthStateChange` listener will pick up the session. The ProtectedRoute logic will handle the redirect automatically.

### Technical Details

- `ProtectedRoute` will fetch the profile from the `profiles` table using the authenticated user's ID
- It checks if `university_level`, `course_name`, and `university` are all non-empty
- If incomplete and current path is not `/onboarding`, redirect to `/onboarding`
- The onboarding route itself is excluded from this check to avoid redirect loops
- Login page will do a similar profile check before deciding where to navigate

