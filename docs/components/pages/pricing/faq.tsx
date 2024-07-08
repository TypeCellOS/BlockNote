import { Disclosure } from "@headlessui/react";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";

const faqs = [
  {
    question: "What's the best thing about Switzerland?",
    answer:
      "I don't know, but the flag is a big plus. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quas cupiditate laboriosam fugiat.",
  },
  {
    question: "What's the best thing about Switzerland?",
    answer:
      "I don't know, but the flag is a big plus. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quas cupiditate laboriosam fugiat.",
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
