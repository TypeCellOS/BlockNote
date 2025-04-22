import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface VerifyEmailProps {
  name?: string;
  url?: string;
}

export const VerifyEmail = ({ name, url }: VerifyEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Preview>BlockNote - Verify your email address</Preview>
        <Container style={container}>
          <Img
            src="https://www.blocknotejs.org/img/logos/icon_light_500.png"
            width="40"
            height="40"
            alt="BlockNote"
          />
          <Section>
            <Text style={text}>Hi{name ? ` ${name}` : ""},</Text>
            <Text style={text}>
              Thanks for signing up for BlockNote! To complete your
              registration, please verify your email address by clicking the
              button below:
            </Text>
            <Button style={button} href={url}>
              Verify Email
            </Button>
            <Text style={text}>
              If you didn&apos;t create a BlockNote account, you can safely
              ignore this email.
            </Text>
            <Text style={text}>
              To keep your account secure, please don&apos;t forward this email
              to anyone.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

VerifyEmail.PreviewProps = {
  name: "",
  url: "https://blocknotejs.org",
} as VerifyEmailProps;

export default VerifyEmail;

const main = {
  backgroundColor: "#f6f9fc",
  padding: "10px 0",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #f0f0f0",
  padding: "45px",
};

const text = {
  fontSize: "16px",
  fontFamily:
    "'Open Sans', 'HelveticaNeue-Light', 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif",
  fontWeight: "300",
  color: "#404040",
  lineHeight: "26px",
};

const button = {
  backgroundColor: "#007ee6",
  borderRadius: "4px",
  color: "#fff",
  fontFamily: "'Open Sans', 'Helvetica Neue', Arial",
  fontSize: "15px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "210px",
  padding: "14px 7px",
};
