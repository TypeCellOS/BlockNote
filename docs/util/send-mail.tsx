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
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    console.log(template, props);
    throw new Error(
      "SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS must be set to send emails",
    );
  }

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
}
