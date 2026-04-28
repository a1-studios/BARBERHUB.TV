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
    <Preview>Your BarberHub.tv verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Section style={card}>
          <Heading style={h1}>Confirm reauthentication</Heading>
          <Text style={text}>Use the code below to confirm your identity:</Text>
          <Section style={codeWrap}>
            <Text style={codeStyle}>{token}</Text>
          </Section>
          <Text style={footer}>
            This code expires shortly. If you didn't request this, you can safely
            ignore this email.
          </Text>
        </Section>
        <Text style={signature}>— The BarberHub.tv Team</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif', padding: '40px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 20px' }
const brandBar = { height: '4px', backgroundColor: '#FF6B1A', borderRadius: '4px 4px 0 0' }
const card = { backgroundColor: '#0a0a0f', padding: '40px 32px', borderRadius: '0 0 12px 12px', color: '#ffffff' }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#cfcfd6', lineHeight: '1.6', margin: '0 0 16px' }
const codeWrap = { textAlign: 'center' as const, margin: '8px 0 24px' }
const codeStyle = { fontFamily: 'SF Mono, Menlo, Courier, monospace', fontSize: '32px', fontWeight: 'bold' as const, color: '#FF6B1A', letterSpacing: '8px', margin: '0', padding: '20px', backgroundColor: '#000000', borderRadius: '10px', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#7a7a85', lineHeight: '1.5', margin: '24px 0 0' }
const signature = { fontSize: '12px', color: '#999999', textAlign: 'center' as const, margin: '24px 0 0' }
