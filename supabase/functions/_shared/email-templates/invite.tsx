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
    <Preview>You've been invited to {siteName}.</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <div style={brand.header}>
          <Text style={brand.brandMark}>
            Barber<span style={brand.brandAccent}>Hub</span>
          </Text>
        </div>

        <Heading style={brand.h1}>You're invited to the Arena</Heading>
        <Text style={brand.text}>
          You've been invited to join <strong>{siteName}</strong> — where
          barbers compete, fans vote, and prizes are won. Accept your invite
          below.
        </Text>

        <Button style={brand.button} href={confirmationUrl}>
          Accept Invite
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
          Sent from{' '}
          <Link href={siteUrl} style={brand.link}>
            {siteUrl.replace(/^https?:\/\//, '')}
          </Link>
          . If this wasn't meant for you, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
