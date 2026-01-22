import React from "react";

const faqs = [
  {
    question: "Isn't it easier to use a Headless editor framework?",
    answer:
      "There are a number of really powerful headless text editor frameworks available. In fact, BlockNote is built on Prosemirror and TipTap. However, even when using a headless library, it takes several months and requires deep expertise to build a fully-featured editor with a polished UI that your users expect.",
  },
  {
    question: "Is BlockNote ready for production use?",
    answer:
      "BlockNote is used by dozens of companies in production, ranging from startups to large enterprises and public institutions. Also, we didn't reinvent the wheel. The core editor is built on top of Prosemirror - a battle tested framework that powers software from Atlassian, Gitlab, the New York Times, and many others.",
  },
  {
    question: "Can I add my own extensions to BlockNote?",
    answer:
      "BlockNote comes with lot of functionality out-of-the-box, but we understand that every use case is different. You can easily customize the built-in UI Components, or create your own custom Blocks, Inline Content, and Styles. If you want to go even further, you can extend the core editor with additional Prosemirror or TipTap plugins.",
  },
  {
    question: "Is BlockNote really free?",
    answer:
      "100% of BlockNote is open source. We offer consultancy, support services and commercial licenses for specific XL packages to help sustain BlockNote. Explore our pricing page for more details.",
  },
];

export const FAQ: React.FC = () => {
  return (
    <section className="relative overflow-hidden border-t border-stone-100 bg-white py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-16">
          <h2 className="font-serif text-5xl font-medium tracking-tight text-stone-900 md:text-6xl">
            Questions?
          </h2>
        </div>

        <div className="grid gap-x-12 gap-y-16 md:grid-cols-2">
          {faqs.map((faq, index) => (
            <div key={index} className="flex flex-col gap-4">
              <h3 className="font-sans text-xl font-bold leading-tight text-stone-900">
                {faq.question}
              </h3>
              <p className="font-sans text-base leading-relaxed text-stone-600">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
