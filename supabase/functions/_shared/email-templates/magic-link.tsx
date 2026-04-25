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
    <Preview>Your one-tap login link to {siteName}.</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <div style={brand.header}>
          <Text style={brand.brandMark}>
            Barber<span style={brand.brandAccent}>Hub</span>
          </Text>
        </div>

        <Heading style={brand.h1}>Step into the Arena</Heading>
        <Text style={brand.text}>
          Tap below to sign in to <strong>{siteName}</strong>. This link works
          once and expires shortly.
        </Text>

        <Button style={brand.button} href={confirmationUrl}>
          Sign In
        </Button>

        <Text style={{ ...brand.text, marginTop: '28px', fontSize: '13px' }}>
          Or paste this link into your browser:
          <br />
          <Link href={confirmationUrl} style={brand.link}>
            {confirmationUrl}
          </Link>
        </Text>

        <Hr style={brand.divider} />
        <Text style={brand.footer}>
          Didn't request this? You can safely ignore this email — your account
          stays locked.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
