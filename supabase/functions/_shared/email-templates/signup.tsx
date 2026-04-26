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
    <Preview>Step into the BarberHub Arena — confirm your email</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        <Section style={card}>
          <Section style={accentBar} />
          <Section style={brandHeader}>
            <Text style={brand}>
              BARBER<span style={brandAccent}>HUB</span>
            </Text>
            <Text style={tagline}>The Global Arena</Text>
          </Section>
          <Section style={bodySection}>
            <Heading style={h1}>Step Into The Arena.</Heading>
            <Text style={text}>
              Welcome to BarberHub. You're one tap away from joining the global
              stage where master barbers compete, fans crown champions, and
              reputations are built blade by blade.
            </Text>
            <Text style={text}>Confirm your email to activate your account.</Text>
            <Section style={buttonWrap}>
              <Button style={button} href={confirmationUrl}>
                ACTIVATE ACCOUNT →
              </Button>
            </Section>
            <Text style={smallMuted}>
              Or paste this link into your browser:
            </Text>
            <Text style={linkText}>{confirmationUrl}</Text>
            <Text style={footer}>
              If you didn't create a BarberHub account ({recipient}), you can
              safely ignore this email.
            </Text>
            <Text style={footerBrand}>
              BarberHub · {siteUrl.replace(/^https?:\/\//, '')}
            </Text>
          </Section>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  margin: 0,
  padding: '32px 16px',
}
const outerContainer = { maxWidth: '560px', margin: '0 auto' }
const card = {
  backgroundColor: '#0a0a0a',
  border: '1px solid #1a1a1a',
  borderRadius: '4px',
  overflow: 'hidden' as const,
}
const accentBar = {
  height: '4px',
  background: 'linear-gradient(90deg,#FF5F1F 0%,#FF8C00 50%,#FFB347 100%)',
  fontSize: 0,
  lineHeight: 0,
}
const brandHeader = {
  padding: '32px 36px 24px 36px',
  borderBottom: '1px solid #1a1a1a',
}
const brand = {
  margin: 0,
  fontSize: '22px',
  fontWeight: 900 as const,
  letterSpacing: '0.18em',
  color: '#ffffff',
  textTransform: 'uppercase' as const,
  lineHeight: 1,
}
const brandAccent = { color: '#FF5F1F' }
const tagline = {
  margin: '6px 0 0 0',
  fontSize: '10px',
  fontWeight: 700 as const,
  letterSpacing: '0.4em',
  color: '#FF5F1F',
  textTransform: 'uppercase' as const,
}
const bodySection = { padding: '40px 36px 36px 36px' }
const h1 = {
  margin: '0 0 20px 0',
  fontSize: '28px',
  fontWeight: 900 as const,
  color: '#ffffff',
  lineHeight: 1.1,
  letterSpacing: '-0.01em',
  textTransform: 'uppercase' as const,
}
const text = {
  margin: '0 0 16px 0',
  fontSize: '15px',
  lineHeight: 1.65,
  color: '#b8b8b8',
}
const buttonWrap = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#FF5F1F',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 900 as const,
  letterSpacing: '0.16em',
  padding: '16px 38px',
  borderRadius: '4px',
  textDecoration: 'none',
  textTransform: 'uppercase' as const,
}
const smallMuted = {
  margin: '24px 0 6px 0',
  fontSize: '11px',
  fontWeight: 700 as const,
  letterSpacing: '0.2em',
  color: '#666666',
  textTransform: 'uppercase' as const,
}
const linkText = {
  margin: '0 0 24px 0',
  fontSize: '12px',
  color: '#FF5F1F',
  wordBreak: 'break-all' as const,
}
const footer = {
  margin: '24px 0 0 0',
  fontSize: '12px',
  color: '#666666',
  lineHeight: 1.5,
}
const footerBrand = {
  margin: '16px 0 0 0',
  fontSize: '11px',
  letterSpacing: '0.2em',
  color: '#FF5F1F',
  textTransform: 'uppercase' as const,
}
