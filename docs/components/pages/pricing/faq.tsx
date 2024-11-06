import { Disclosure } from "@headlessui/react";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";

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
    If you make changes to the BlockNote source files, you're expected to publish these changes so the wider community can benefit as well. \nThe XL packages are dual-licensed and available under AGPL-3.0 or a commercial license as part of the BlockNote Business subscription or above.`,
  },
  // More questions...
];

export function FAQ() {
  return (
    <div className="w-full max-w-screen-lg px-6 py-24 sm:py-32 lg:px-8 lg:py-40">
      <div className=" divide-y divide-gray-200 dark:divide-gray-800">
        <h2 className="text-2xl font-bold leading-10 tracking-tight">
          Frequently asked questions
        </h2>
        <dl className="mt-10 space-y-6 divide-y divide-gray-200 dark:divide-gray-800">
          {faqs.map((faq) => (
            <Disclosure key={faq.question} as="div" className="pt-6">
              <dt>
                <Disclosure.Button className="group flex w-full items-start justify-between text-left">
                  <span className="text-base font-semibold leading-7">
                    {faq.question}
                  </span>
                  <span className="ml-6 flex h-7 items-center">
                    <PlusIcon
                      aria-hidden="true"
                      className="h-6 w-6 group-data-[open]:hidden"
                    />
                    <MinusIcon
                      aria-hidden="true"
                      className="h-6 w-6 [.group:not([data-open])_&]:hidden"
                    />
                  </span>
                </Disclosure.Button>
              </dt>
              <Disclosure.Panel as="dd" className="mt-2 pr-12">
                <p className="text-base leading-7 text-[#00000080] dark:text-[#FFFFFFB2]">
                  {faq.answer}
                </p>
              </Disclosure.Panel>
            </Disclosure>
          ))}
        </dl>
      </div>
    </div>
  );
}
