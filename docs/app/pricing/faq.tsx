"use client";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Heading } from "fumadocs-ui/components/heading";

const faqs = [
  {
    question:
      "What license is BlockNote using? Do I need a subscription to use BlockNote?",
    answer: (
      <>
        We're proud to say that BlockNote is 100% open source software. The core
        library is licensed under the MPL 2.0 license, which allows you to use
        BlockNote in commercial (and closed-source) applications - even without
        a subscription. If you make changes to the BlockNote source files,
        you're expected to publish these changes so the wider community can
        benefit as well.
        <br />
        The XL packages (like AI Integration, Multi-column layouts, and
        Exporters) are dual-licensed and available under AGPL-3.0, or - for
        closed-source projects - a commercial license as part of the BlockNote
        Business subscription or above.
      </>
    ),
  },
  {
    question: "When do I need a commercial license?",
    answer: (
      <>
        Only when you use any of the XL packages (like AI Integration,
        Multi-column layouts, and Exporters) and you cannot comply with the
        AGPL-3.0 license you'll need a{" "}
        <a href="/legal/blocknote-xl-commercial-license">commercial license</a>.
        This is likely to be the case if you're building closed-source
        applications. The BlockNote Business subscription and above includes a
        commercial license.
      </>
    ),
  },
  {
    question: "Why did you choose to dual-license the XL packages?",
    answer: (
      <>
        The BlockNote team has been developing BlockNote for several years under
        a very permissive MPL license and we're committed to keep the vast
        majority of the library under this license.
        <br />
        By offering a limited set of advanced functionality (the XL Packages)
        under a dual license model (a copyleft open-source license and a
        commercial license), we can support a full-time team of engineers and
        continue to develop BlockNote - while keeping 100% of the code we build
        open source.
      </>
    ),
  },
  {
    question:
      "Is there any limit to the number of documents or users I can have?",
    answer: `With BlockNote, there are no limits on the number of documents or users you can have. You’re free to run the software on your own infrastructure, and none of your data passes through our servers — your documents and users remain entirely your business.`,
  },
  {
    question: "What payment methods do you accept?",
    answer: `We accept all major credit cards. If you require a different payment method, please contact us.`,
  },
];

export function FAQ() {
  return (
    <div className="w-full max-w-screen-lg px-6 py-24 sm:py-32 lg:px-8 lg:py-40">
      <div className="prose">
        <Heading as="h2">Frequently asked questions</Heading>
        <Accordions type="multiple">
          {faqs.map((faq) => (
            <Accordion key={faq.question} title={faq.question}>
              {faq.answer}
            </Accordion>
          ))}
        </Accordions>
      </div>
    </div>
  );
}
