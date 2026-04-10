import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "AssignmentPro"

interface StudentInviteProps {
  adminName?: string
  adminEmail?: string
}

const StudentInviteEmail = ({ adminName, adminEmail }: StudentInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{adminName || 'An administrator'} wants to manage your {SITE_NAME} account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={logo}>🎓 {SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>You've been invited!</Heading>
        <Text style={text}>
          <strong>{adminName || 'An administrator'}</strong>
          {adminEmail ? ` (${adminEmail})` : ''} wants to manage your {SITE_NAME} account.
        </Text>
        <Text style={text}>
          Once you accept, they'll be able to view your assignments, create new ones,
          and help organise your work in folders.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href="https://essay-genius-hub.lovable.app/dashboard">
            View Invitation
          </Button>
        </Section>
        <Text style={footer}>
          Log in to your {SITE_NAME} account to accept or decline this invitation.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: StudentInviteEmail,
  subject: ({ adminName }: Record<string, any>) =>
    `${adminName || 'An administrator'} wants to manage your AssignmentPro account`,
  displayName: 'Student invite',
  previewData: { adminName: 'Dr. Smith', adminEmail: 'smith@university.ac.uk' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Arial', 'Helvetica', sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { padding: '20px 0 10px' }
const logo = { fontSize: '18px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: '#1a365d',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
