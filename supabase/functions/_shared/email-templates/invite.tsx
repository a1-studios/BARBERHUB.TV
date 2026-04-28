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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to BarberHub.tv</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Section style={card}>
          <Heading style={h1}>You've been invited</Heading>
          <Text style={text}>
            You've been invited to join{' '}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            . Tap the button below to accept and create your account.
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              Accept Invitation
            </Button>
          </Section>
          <Text style={footer}>
            If you weren't expecting this invitation, you can safely ignore this email.
          </Text>
        </Section>
        <Text style={signature}>— The BarberHub.tv Team</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif', padding: '40px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 20px' }
const brandBar = { height: '4px', backgroundColor: '#FF6B1A', borderRadius: '4px 4px 0 0' }
const card = { backgroundColor: '#0a0a0f', padding: '40px 32px', borderRadius: '0 0 12px 12px', color: '#ffffff' }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#cfcfd6', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#FF6B1A', textDecoration: 'none' }
const buttonWrap = { textAlign: 'center' as const, margin: '8px 0 24px' }
const button = { backgroundColor: '#FF6B1A', color: '#0a0a0f', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#7a7a85', lineHeight: '1.5', margin: '24px 0 0' }
const signature = { fontSize: '12px', color: '#999999', textAlign: 'center' as const, margin: '24px 0 0' }
