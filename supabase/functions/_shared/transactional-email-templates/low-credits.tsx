import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "AssignmentPro"

interface LowCreditsProps {
  name?: string
  creditsRemaining?: number
}

const LowCreditsEmail = ({ name, creditsRemaining }: LowCreditsProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're running low on credits — only {creditsRemaining ?? 0} words remaining</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={logo}>🎓 {SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>Running Low on Credits ⚠️</Heading>
        <Text style={text}>
          {name ? `Hi ${name},` : 'Hi there,'} just a quick heads up — you have{' '}
          <strong>{creditsRemaining?.toLocaleString() ?? '0'} words</strong> remaining
          in your credit balance.
        </Text>
        <Section style={warningBox}>
          <Text style={warningText}>
            📊 Credits Remaining: <strong>{creditsRemaining?.toLocaleString() ?? '0'} words</strong>
          </Text>
        </Section>
        <Text style={text}>
          To keep generating assignments without interruption, consider upgrading
          your plan for more credits.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href="https://essay-genius-hub.lovable.app/settings">
            Upgrade Your Plan
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          Best regards,<br />The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LowCreditsEmail,
  subject: 'You\'re running low on credits',
  displayName: 'Low credits warning',
  previewData: { name: 'Jane', creditsRemaining: 350 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { borderBottom: '2px solid #d4a843', paddingBottom: '12px', marginBottom: '24px' }
const logo = { fontSize: '18px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const warningBox = {
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '16px 0',
  border: '1px solid #f59e0b',
}
const warningText = { fontSize: '15px', color: '#92400e', margin: '0' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#1a365d',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  padding: '12px 28px',
  borderRadius: '6px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#9ca3af', margin: '32px 0 0', lineHeight: '1.5' }
