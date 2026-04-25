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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new email on {siteName}.</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <div style={brand.header}>
          <Text style={brand.brandMark}>
            Barber<span style={brand.brandAccent}>Hub</span>
          </Text>
        </div>

        <Heading style={brand.h1}>Confirm your new email</Heading>
        <Text style={brand.text}>
          You requested to change the email on your <strong>{siteName}</strong>{' '}
          account from <strong>{email}</strong> to <strong>{newEmail}</strong>.
          Tap below to confirm.
        </Text>

        <Button style={brand.button} href={confirmationUrl}>
          Confirm Email Change
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
          Didn't request this change? Ignore this email — your account email
          stays the same.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
