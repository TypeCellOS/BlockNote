import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import MagicLinkEmail from "@/emails/magic-link";
import VerifyEmail from "@/emails/verify-email";
import ResetPassword from "@/emails/reset-password";

const transporter = nodemailer.createTransport({
  host: String(process.env.SMTP_HOST),
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE !== "false", // true for port 465, false for other ports
  auth: {
    user: String(process.env.SMTP_USER),
    pass: String(process.env.SMTP_PASS),
  },
});

type TEMPLATES = {
  verifyEmail: {
    url: string;
    name?: string;
  };
  resetPassword: {
    url: string;
    name?: string;
  };
  magicLink: {
    url: string;
    name?: string;
  };
};

const TEMPLATE_TEXTS = {
  verifyEmail: (props: TEMPLATES["verifyEmail"]) =>
    render(<VerifyEmail name={props.name} url={props.url} />, {
      pretty: true,
      plainText: true,
    }),
  resetPassword: (props: TEMPLATES["resetPassword"]) =>
    render(<ResetPassword name={props.name} url={props.url} />, {
      pretty: true,
      plainText: true,
    }),
  magicLink: (props: TEMPLATES["magicLink"]) =>
    render(<MagicLinkEmail name={props.name} url={props.url} />, {
      pretty: true,
      plainText: true,
    }),
};
const TEMPLATE_HTMLS = {
  verifyEmail: (props: TEMPLATES["verifyEmail"]) =>
    render(<VerifyEmail name={props.name} url={props.url} />, {
      pretty: true,
    }),
  resetPassword: (props: TEMPLATES["resetPassword"]) =>
    render(<ResetPassword name={props.name} url={props.url} />, {
      pretty: true,
    }),
  magicLink: (props: TEMPLATES["magicLink"]): Promise<string> =>
    render(<MagicLinkEmail name={props.name} url={props.url} />, {
      pretty: true,
    }),
};

export async function sendEmail<T extends keyof TEMPLATES>({
  to,
  template,
  props,
}: {
  to: string;
  template: T;
  props: TEMPLATES[T];
}) {
  const info = await transporter.sendMail({
    from: '"BlockNote" <nick@blocknotejs.org>',
    to,
    subject: {
      verifyEmail: "BlockNote - Verify your email address",
      resetPassword: "BlockNote - Reset your password",
      magicLink: "BlockNote - Sign in to your account",
    }[template],
    text: await TEMPLATE_TEXTS[template](props),
    html: await TEMPLATE_HTMLS[template](props),
  });

  console.log("Email sent: ", info.messageId);
}
