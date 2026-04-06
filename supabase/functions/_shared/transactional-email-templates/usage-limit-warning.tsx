import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "AssignmentPro"

interface UsageLimitWarningProps {
  name?: string
  used?: number
  limit?: number
  planName?: string
}

const UsageLimitWarningEmail = ({ name, used, limit, planName }: UsageLimitWarningProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've used {used || 0} of {limit || 0} assignments this month</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Hey ${name},` : 'Hey there,'}
        </Heading>
        <Text style={text}>
          You've used <strong>{used || 0} out of {limit || 0}</strong> assignments on your{' '}
          <strong>{planName || 'current'}</strong> plan this month. That's 80% of your monthly limit.
        </Text>
        <Text style={text}>
          To keep creating assignments without interruption, consider upgrading your plan.
        </Text>
        <Section style={btnSection}>
          <Button style={button} href="https://essay-genius-hub.lovable.app/plans">
            View Plans
          </Button>
        </Section>
        <Text style={footer}>Best regards, The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: UsageLimitWarningEmail,
  subject: "You're approaching your monthly assignment limit",
  displayName: 'Usage limit warning (80%)',
  previewData: { name: 'Alex', used: 5, limit: 7, planName: 'Student Plus' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 20px' }
const btnSection = { textAlign: 'center' as const, margin: '30px 0' }
const button = {
  backgroundColor: '#b8923e',
  color: '#1a365d',
  padding: '12px 30px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
