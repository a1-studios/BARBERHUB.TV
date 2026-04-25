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
  Text,
} from 'npm:@react-email/components@0.0.22'
import { brand } from './_brand.ts'

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
    <Preview>One click to claim your spot — and your prize.</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <div style={brand.header}>
          <Text style={brand.brandMark}>
            Barber<span style={brand.brandAccent}>Hub</span>
          </Text>
        </div>

        <Heading style={brand.h1}>Confirm your spot in the Arena</Heading>
        <Text style={brand.text}>
          Welcome to <strong>{siteName}</strong> — the global stage for barbers
          and the fans who back them. Tap the button below to verify{' '}
          <strong>{recipient}</strong> and unlock your prize.
        </Text>

        <Button style={brand.button} href={confirmationUrl}>
          Verify & Claim Prize
        </Button>

        <Text style={{ ...brand.text, marginTop: '28px', fontSize: '13px' }}>
          Button not working? Paste this link into your browser:
          <br />
          <Link href={confirmationUrl} style={brand.link}>
            {confirmationUrl}
          </Link>
        </Text>

        <Hr style={brand.divider} />
        <Text style={brand.footer}>
          You're receiving this because someone signed up at{' '}
          <Link href={siteUrl} style={brand.link}>
            {siteUrl.replace(/^https?:\/\//, '')}
          </Link>
          . If that wasn't you, ignore this email — no account will be created.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
