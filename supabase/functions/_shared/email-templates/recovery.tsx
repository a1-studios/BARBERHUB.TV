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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {siteName} password.</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <div style={brand.header}>
          <Text style={brand.brandMark}>
            Barber<span style={brand.brandAccent}>Hub</span>
          </Text>
        </div>

        <Heading style={brand.h1}>Reset your password</Heading>
        <Text style={brand.text}>
          We got a request to reset the password on your{' '}
          <strong>{siteName}</strong> account. Tap below to set a new one.
        </Text>

        <Button style={brand.button} href={confirmationUrl}>
          Reset Password
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
          Didn't request a reset? You can ignore this email — your password
          stays the same.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
