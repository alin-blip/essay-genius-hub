import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "AssignmentPro"

interface ReferralSignupProps {
  affiliateName?: string
  referralEmail?: string
}

const ReferralSignupEmail = ({ affiliateName, referralEmail }: ReferralSignupProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Someone just signed up through your referral link!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={logo}>🎓 {SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>
          {affiliateName ? `Hey ${affiliateName}, you got a new sign-up! 🎉` : 'You got a new sign-up! 🎉'}
        </Heading>
        <Text style={text}>
          Someone{referralEmail ? ` (${referralEmail})` : ''} has just signed up on {SITE_NAME} using your referral link.
        </Text>
        <Section style={highlightBox}>
          <Text style={highlightText}>
            Status: <strong>Signed Up</strong>
          </Text>
        </Section>
        <Text style={text}>
          When they upgrade to a paid plan, you'll automatically earn your <strong>50% commission</strong>. Keep sharing your link!
        </Text>
        <Text style={footer}>Best regards, The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReferralSignupEmail,
  subject: '🎉 New sign-up through your referral link!',
  displayName: 'Referral sign-up notification',
  previewData: { affiliateName: 'Alex', referralEmail: 'student@uni.ac.uk' },
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
