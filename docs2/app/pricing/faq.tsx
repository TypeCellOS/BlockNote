import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Heading } from "fumadocs-ui/components/heading";

const faqs = [
  {
    question:
      "What license is BlockNote using? Do I need a subscription to use BlockNote?",
    answer: (
      <>
        We're proud to say that BlockNote is 100% open source software. The core
        library is licensed under the{" "}
        <a href="https://www.mozilla.org/en-US/MPL/2.0/">MPL 2.0 license</a>,
        which allows you to use BlockNote in commercial and closed-source
        applications - even without a subscription. If you make changes to the
        BlockNote source files, you're expected to publish these changes so the
        wider community can benefit as well.
        <br />
        The XL packages (like AI integration, multi-column layouts, and
        exporters) are dual-licensed and available under{" "}
        <a href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0</a>, or -
        for closed-source projects - a commercial license as part of the
        BlockNote Business subscription or above. See the{" "}
        <a href="/legal/blocknote-xl-commercial-license">
          commercial license terms
        </a>{" "}
        for the exact details.
      </>
    ),
  },
  {
    question: "When do I need a commercial license?",
    answer: (
      <>
        Only when you use any of the XL packages (like AI integration,
        multi-column layouts, and exporters) and you cannot comply with the
        GPL-3.0 license you'll need a{" "}
        <a href="/legal/blocknote-xl-commercial-license">commercial license</a>.
        This is likely to be the case when you're building closed-source
        applications. The BlockNote Business subscription and above includes a
        commercial license.
      </>
    ),
  },
  {
    question: "Why did you choose to dual-license the XL packages?",
    answer: (
      <>
        We’ve built BlockNote as open source from day one and remain committed
        to keeping the core library licensed under the MPL 2.0. That means it’s
        free to use—even in commercial and closed-source projects.
        <br />
        To sustainably support ongoing development, we offer a small set of
        advanced features (the XL packages) under a dual-license model:
        <ul>
          <li>GPL-3.0 for open-source projects</li>
          <li>
            Commercial license (included in the BlockNote Business tier and
            above) for closed-source use
          </li>
        </ul>
        This approach allows us to fund a full-time team while keeping 100% of
        the code we build open source. It’s our way of balancing community
        accessibility with long-term sustainability.
      </>
    ),
  },
  {
    question: "What kind of support is included in a license?",
    answer: (
      <>
        We have you covered! All BlockNote subscriptions come with prioritized
        support. See the{" "}
        <a href="/legal/service-level-agreement">Service Level Agreement</a> for
        the exact details.
      </>
    ),
  },
  {
    question:
      "Is there any limit to the number of documents or users I can have?",
    answer: `With BlockNote, there are no limits on the number of documents or users you can have. 
    You're free to run the software on your own infrastructure, and none of your data passes through our servers — your documents and users remain entirely your business.`,
  },
  {
    question: "What if I have more than one SaaS or Web application?",
    answer: (
      <>
        The BlockNote Commercial license (included in the Business tier and
        above) for XL packages covers one application per license. See the{" "}
        <a href="/legal/blocknote-xl-commercial-license">
          commercial license terms
        </a>{" "}
        for the exact details.
        <br />
        If you want to use XL packages in more than one app, contact us at
        team@blocknotejs.org; we're happy to work with you on a custom license.
      </>
    ),
  },
  {
    question: "Do you offer any discounts for startups?",
    answer: (
      <>
        Yes! We offer a discount for startups with less than 5 employees. See
        the{" "}
        <a href="/legal/blocknote-xl-commercial-license">
          commercial license terms
        </a>{" "}
        for the exact details.
      </>
    ),
  },
  {
    question: "What payment methods do you accept?",
    answer: `We accept all major credit cards. If you require a different payment method, please contact us.`,
  },
];

export function FAQ() {
  return (
    <div className="w-full max-w-screen-lg px-6 pt-24 sm:pt-32 lg:px-8 lg:pt-40">
      <div className="prose">
        <Heading as="h2">Frequently asked questions</Heading>
        <Accordions multiple>
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
