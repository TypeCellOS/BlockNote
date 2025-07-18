"use client";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Heading } from "fumadocs-ui/components/heading";

const faqs = [
  {
    question: "Is BlockNote Pro a different library than BlockNote?",
    answer: `"BlockNote Pro" is not an additional library, but instead a subscription service built around the open-source BlockNote library.
       With your subscription, you are ensuring the sustainable maintenance and development of BlockNote and make sure it stays up-to-date under an open source license. 
       You'll also get prioritized support, feature requests, and access to Pro examples.`,
  },
  {
    question: "What payment methods do you accept?",
    answer: `BlockNote Pro is fully integrated with GitHub Sponsors, which means invoicing and payment is handled by GitHub.
    If you require a different payment method, please contact us.`,
  },
  {
    question:
      "What License is BlockNote using? Can I use it for commercial projects?",
    answer: `BlockNote is open source software licensed under the MPL 2.0 license, which allows you to use BlockNote in commercial (and closed-source) applications - even without a subscription. 
    If you make changes to the BlockNote source files, you're expected to publish these changes so the wider community can benefit as well. \nThe XL packages are dual-licensed and available under AGPL-3.0, or - for closed-source projects - a commercial license as part of the BlockNote Business subscription or above.`,
  },
  // More questions...
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
