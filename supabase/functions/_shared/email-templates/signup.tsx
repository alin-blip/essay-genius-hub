/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={logo}>🎓 {siteName}</Text>
        </Section>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Verify Email
          </Button>
        </Section>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { borderBottom: '2px solid #d4a843', paddingBottom: '12px', marginBottom: '24px' }
const logo = { fontSize: '18px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: '#1a365d', textDecoration: 'underline' }
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
