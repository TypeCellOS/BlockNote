import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Link,
} from "@react-email/components";

export interface WelcomeEmailProps {
  name?: string;
}

export const WelcomeEmail = ({ name }: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Preview>BlockNote - Next Steps & Subscription</Preview>
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
              Thanks for verifying your email address and welcome to BlockNote!
            </Text>
            <Text style={text}>
              Your next step is to subscribe to a BlockNote plan to unlock more
              features. Subscribing to the Business plan grants you a license
              for our XL packages. All paid plans also receive prioritized bug
              support through GitHub.
            </Text>
            <Link style={button} href="https://www.blocknotejs.org/pricing">
              View Plans & Subscribe
            </Link>
            <Text style={text}>
              We appreciate your support for our open-source project!
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

WelcomeEmail.PreviewProps = {
  name: "Alex",
} as WelcomeEmailProps;

export default WelcomeEmail;

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
  width: "230px",
  padding: "14px 7px",
  marginTop: "20px",
};
