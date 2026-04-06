import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "AssignmentPro"

interface AssignmentReadyProps {
  name?: string
  assignmentTitle?: string
  wordCount?: number
  targetGrade?: string
  assignmentId?: string
}

const AssignmentReadyEmail = ({
  name,
  assignmentTitle,
  wordCount,
  targetGrade,
  assignmentId,
}: AssignmentReadyProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your assignment "{assignmentTitle || 'Untitled'}" is ready to view</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={logo}>🎓 {SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>Your Assignment is Ready! ✅</Heading>
        <Text style={text}>
          {name ? `Hi ${name},` : 'Hi there,'} your assignment has been generated
          successfully and is ready to review.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailLabel}>Title</Text>
          <Text style={detailValue}>{assignmentTitle || 'Untitled Assignment'}</Text>
          {wordCount && (
            <>
              <Text style={detailLabel}>Word Count</Text>
              <Text style={detailValue}>{wordCount.toLocaleString()} words</Text>
            </>
          )}
          {targetGrade && (
            <>
              <Text style={detailLabel}>Target Grade</Text>
              <Text style={detailValue}>{targetGrade}</Text>
            </>
          )}
        </Section>
        <Section style={buttonSection}>
          <Button
            style={button}
            href={`https://essay-genius-hub.lovable.app/assignment/${assignmentId || ''}`}
          >
            View Assignment
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={tipText}>
          💡 Tip: Use the humanise feature to make the writing sound more natural
          before submitting.
        </Text>
        <Text style={footer}>
          Best regards,<br />The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AssignmentReadyEmail,
  subject: (data: Record<string, any>) =>
    `Your assignment "${data.assignmentTitle || 'Untitled'}" is ready`,
  displayName: 'Assignment ready',
  previewData: {
    name: 'Jane',
    assignmentTitle: 'Impact of Digital Marketing on Consumer Behaviour',
    wordCount: 3000,
    targetGrade: 'First Class (70%+)',
    assignmentId: 'abc-123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { borderBottom: '2px solid #d4a843', paddingBottom: '12px', marginBottom: '24px' }
const logo = { fontSize: '18px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '16px 0',
  border: '1px solid #e5e7eb',
}
const detailLabel = { fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase' as const, margin: '0 0 2px', fontWeight: 'bold' as const }
const detailValue = { fontSize: '15px', color: '#1a365d', margin: '0 0 12px', fontWeight: '500' as const }
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
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const tipText = { fontSize: '14px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 24px', backgroundColor: '#fffbeb', padding: '12px 16px', borderRadius: '6px' }
const footer = { fontSize: '13px', color: '#9ca3af', margin: '32px 0 0', lineHeight: '1.5' }
