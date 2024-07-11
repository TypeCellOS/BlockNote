import { SectionIntro } from "@/components/pages/landing/shared/Headings";
import { Section } from "@/components/pages/landing/shared/Section";
import { Link } from "nextra-theme-docs";

const faqs = [
  {
    id: 1,
    question: "Isn't it easier to use a Headless editor framework?",
    answer: `There are a number of really powerful headless text editor frameworks available. In fact, BlockNote is built on Prosemirror and TipTap. 
      However, even when using a headless library, it takes several months and requires deep expertise to build a fully-featured editor with a polished UI that your users expect.`,
  },
  {
    id: 2,
    question: "Is BlockNote ready for production use?",
    answer: `BlockNote is used by several companies in production. Also, we didn't reinvent the wheel. The core editor is built on top of Prosemirror - a battle tested framework that powers software from Atlassian, Gitlab, the New York Times, and many others.`,
  },
  {
    id: 3,
    question: "Can I add my own extensions to BlockNote?",
    answer: `BlockNote comes with lot of functionality out-of-the-box, but we understand that every use case is different. You can easily customize the built-in UI Components, or create your own custom Blocks, Inline Content, and Styles. 
      If you want to go even further, you can extend the core editor with additional Prosemirror or TipTap plugins.`,
  },
  {
    id: 4,
    question: "Is BlockNote really free?",
    answer: `100% of BlockNote is open source. While the library is free, we offer paid consultancy and support services to help sustain BlockNote.   
    If you are using BlockNote in a commercial project, we encourage to sign up for BlockNote Pro!`,
  },
];

export function FAQ() {
  return (
    <Section className="py-16 sm:py-16">
      <div className="z-20 flex max-w-full flex-col items-center gap-12 px-6 text-center md:max-w-7xl">
        <SectionIntro
          header={"Frequently asked questions"}
          subtext={
            <>
              More questions? <Link href="/about">Reach out to our team</Link>.
            </>
          }
        />

        {/* <h2 className="text-2xl font-bold leading-10 tracking-tight text-gray-900 dark:text-white">
          Frequently asked questions
        </h2>
        <p className="mt-6 text-base leading-7 text-gray-600 dark:text-gray-300">
          More questions? <Link href="/about">Reach out to our team</Link>.
        </p> */}
        <dl className="space-y-16 text-left sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-16 sm:space-y-0 lg:gap-x-10">
          {faqs.map((faq) => (
            <div key={faq.id}>
              <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                {faq.question}
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
