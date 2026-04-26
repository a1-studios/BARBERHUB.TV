/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
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
    <Preview>Activate your BarberHub account — the arena awaits</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={brandMark}>BARBERHUB.TV</Text>
          <Hr style={accentBar} />
          <Heading style={h1}>Activate your account</Heading>
          <Text style={text}>
            Welcome to <strong style={brand}>BarberHub</strong>, the global
            arena where barbers compete, fans vote, and reputations are forged.
          </Text>
          <Text style={text}>
            Confirm your email <strong>{recipient}</strong> to step into the arena:
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              Activate Account →
            </Button>
          </Section>
          <Text style={fineprint}>
            Or paste this link into your browser:
            <br />
            <Link href={confirmationUrl} style={link}>
              {confirmationUrl}
            </Link>
          </Text>
          <Hr style={divider} />
          <Text style={footer}>
            Didn't sign up? Ignore this email — no account will be created.
          </Text>
          <Text style={footerBrand}>
            <Link href={siteUrl} style={footerLink}>
              {siteName}
            </Link>{' '}
            · The Global Barber Arena
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  margin: 0,
  padding: 0,
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '40px 20px',
}
const card = {
  backgroundColor: '#0a0a0a',
  borderRadius: '16px',
  padding: '40px 32px',
  border: '1px solid #1f1f1f',
}
const brandMark = {
  fontSize: '11px',
  fontWeight: 700 as const,
  letterSpacing: '0.25em',
  color: '#FF6B1A',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
}
const accentBar = {
  border: 'none',
  borderTop: '2px solid #FF6B1A',
  width: '40px',
  margin: '0 0 24px',
}
const h1 = {
  fontSize: '28px',
  fontWeight: 700 as const,
  color: '#ffffff',
  margin: '0 0 20px',
  lineHeight: '1.2',
  letterSpacing: '-0.02em',
}
const text = {
  fontSize: '15px',
  color: '#b8b8b8',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const brand = { color: '#FF6B1A' }
const buttonWrap = { margin: '32px 0', textAlign: 'center' as const }
const button = {
  backgroundColor: '#FF6B1A',
  color: '#0a0a0a',
  fontSize: '15px',
  fontWeight: 700 as const,
  borderRadius: '10px',
  padding: '16px 32px',
  textDecoration: 'none',
  display: 'inline-block',
  letterSpacing: '0.02em',
}
const fineprint = {
  fontSize: '12px',
  color: '#666666',
  lineHeight: '1.5',
  margin: '24px 0 0',
  wordBreak: 'break-all' as const,
}
const link = { color: '#FF6B1A', textDecoration: 'underline' }
const divider = {
  border: 'none',
  borderTop: '1px solid #1f1f1f',
  margin: '32px 0 20px',
}
const footer = { fontSize: '12px', color: '#666666', margin: '0 0 8px' }
const footerBrand = { fontSize: '11px', color: '#444444', margin: 0 }
const footerLink = { color: '#888888', textDecoration: 'none' }
