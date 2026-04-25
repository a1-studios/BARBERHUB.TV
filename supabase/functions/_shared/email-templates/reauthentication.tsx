/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { brand } from './_brand.ts'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({
  token,
}: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your BarberHub verification code: {token}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <div style={brand.header}>
          <Text style={brand.brandMark}>
            Barber<span style={brand.brandAccent}>Hub</span>
          </Text>
        </div>

        <Heading style={brand.h1}>Your verification code</Heading>
        <Text style={brand.text}>
          Use this code to confirm it's really you. It expires in a few minutes.
        </Text>

        <Text style={brand.code}>{token}</Text>

        <Hr style={brand.divider} />
        <Text style={brand.footer}>
          Didn't request a code? Ignore this email and consider changing your
          password as a precaution.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
