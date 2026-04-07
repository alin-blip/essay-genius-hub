import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "AssignmentPro"

interface ReferralUpgradedProps {
  affiliateName?: string
  referralEmail?: string
  commissionAmount?: string
}

const ReferralUpgradedEmail = ({ affiliateName, referralEmail, commissionAmount }: ReferralUpgradedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Great news — one of your referrals just upgraded!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={logo}>🎓 {SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>
          {affiliateName ? `Hey ${affiliateName}, you earned a commission! 🎉` : 'You earned a commission! 🎉'}
        </Heading>
        <Text style={text}>
          One of your referrals{referralEmail ? ` (${referralEmail})` : ''} has just upgraded to a paid plan on {SITE_NAME}.
        </Text>
        {commissionAmount && (
          <Section style={highlightBox}>
            <Text style={highlightText}>
              Commission earned: <strong>£{commissionAmount}</strong>
            </Text>
          </Section>
        )}
        <Text style={text}>
          Your commission has been automatically processed and will be transferred to your connected Stripe account.
        </Text>
        <Text style={text}>
          Keep sharing your referral link to earn more — you get <strong>50% commission</strong> on every payment!
        </Text>
        <Text style={footer}>Best regards, The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReferralUpgradedEmail,
  subject: '🎉 You earned a commission — a referral just upgraded!',
  displayName: 'Referral upgraded notification',
  previewData: { affiliateName: 'Alex', referralEmail: 'student@uni.ac.uk', commissionAmount: '14.99' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { borderBottom: '2px solid #d4a843', paddingBottom: '12px', marginBottom: '24px' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const highlightBox = { backgroundColor: '#fdf8ed', border: '1px solid #d4a843', borderRadius: '8px', padding: '16px', margin: '0 0 20px' }
const highlightText = { fontSize: '16px', color: '#1a365d', margin: '0', textAlign: 'center' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
