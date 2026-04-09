/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={logo}>🎓 {siteName}</Text>
        </Section>
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>
          Click the button below to log in to {siteName}. This link will expire
          shortly.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Log In
          </Button>
        </Section>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { borderBottom: '2px solid #d4a843', paddingBottom: '12px', marginBottom: '24px' }
const logo = { fontSize: '18px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#d4a843',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  padding: '12px 28px',
  borderRadius: '6px',
  textDecoration: 'none',
}
const footer = { fontSize: '13px', color: '#9ca3af', margin: '32px 0 0', lineHeight: '1.5' }
