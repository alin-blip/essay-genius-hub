/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcome } from './welcome.tsx'
import { template as assignmentReady } from './assignment-ready.tsx'
import { template as lowCredits } from './low-credits.tsx'
import { template as usageLimitWarning } from './usage-limit-warning.tsx'
import { template as referralUpgraded } from './referral-upgraded.tsx'
import { template as referralSignup } from './referral-signup.tsx'
import { template as studentInvite } from './student-invite.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'assignment-ready': assignmentReady,
  'low-credits': lowCredits,
  'usage-limit-warning': usageLimitWarning,
  'referral-upgraded': referralUpgraded,
  'referral-signup': referralSignup,
  'student-invite': studentInvite,
}
