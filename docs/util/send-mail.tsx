import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import MagicLinkEmail from "@/emails/magic-link";
import VerifyEmail from "@/emails/verify-email";
import ResetPassword from "@/emails/reset-password";
import WelcomeEmail from "@/emails/welcome";
import * as Sentry from "@sentry/nextjs";

const IS_SMTP_CONFIGURED =
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  host: String(process.env.SMTP_HOST),
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE !== "false", // true for port 465, false for other ports
  auth: {
    user: String(process.env.SMTP_USER),
    pass: String(process.env.SMTP_PASS),
  },
});

const TEMPLATE_COMPONENTS = {
  verifyEmail: {
    subject: "BlockNote - Verify your email address",
    component: VerifyEmail,
  },
  resetPassword: {
    subject: "BlockNote - Reset your password",
    component: ResetPassword,
  },
  magicLink: {
    subject: "BlockNote - Sign in to your account",
    component: MagicLinkEmail,
  },
  welcome: {
    subject: "BlockNote - Welcome to BlockNote",
    component: WelcomeEmail,
  },
} as const;

export async function sendEmail<T extends keyof typeof TEMPLATE_COMPONENTS>({
  to,
  template,
  props,
}: {
  to: string;
  template: T;
  props: Parameters<(typeof TEMPLATE_COMPONENTS)[T]["component"]>[0];
}) {
  if (!IS_SMTP_CONFIGURED) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS must be set to send emails",
      );
    }

    console.log(
      "No SMTP credentials found, skipping email: ",
      await render(TEMPLATE_COMPONENTS[template].component(props), {
        pretty: true,
        plainText: true,
      }),
    );
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: '"BlockNote" <nick@blocknotejs.org>',
      to,
      subject: TEMPLATE_COMPONENTS[template].subject,
      text: await render(TEMPLATE_COMPONENTS[template].component(props), {
        pretty: true,
        plainText: true,
      }),
      html: await render(TEMPLATE_COMPONENTS[template].component(props), {
        pretty: true,
      }),
    });

    console.log("Email sent: ", info.messageId);
  } catch (err) {
    Sentry.captureException(err);
  }
}
