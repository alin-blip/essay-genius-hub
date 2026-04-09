/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={logo}>🎓 AssignmentPro</Text>
        </Section>
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { borderBottom: '2px solid #d4a843', paddingBottom: '12px', marginBottom: '24px' }
const logo = { fontSize: '18px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#1a365d',
  margin: '0 0 30px',
  textAlign: 'center' as const,
  backgroundColor: '#f3f4f6',
  padding: '16px',
  borderRadius: '6px',
  letterSpacing: '4px',
}
const footer = { fontSize: '13px', color: '#9ca3af', margin: '32px 0 0', lineHeight: '1.5' }
