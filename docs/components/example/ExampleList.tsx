import { Card, Cards } from "../../components/cards";
import { EXAMPLES_LIST } from "../../components/example/generated/exampleList.gen";
import { ProBadge } from "../../components/example/ProBadge";
import { proExamplesList } from "../../components/example/proExamplesList";

export function ExampleGroup(props: { examples: (typeof EXAMPLES_LIST)[0] }) {
  return (
    <>
      <h2 className="nx-font-semibold nx-tracking-tight nx-text-slate-900 dark:nx-text-slate-100 nx-mt-10 nx-border-b nx-pb-1 nx-text-3xl nx-border-neutral-200/70 contrast-more:nx-border-neutral-400 dark:nx-border-primary-100/10 contrast-more:dark:nx-border-neutral-400">
        {props.examples.text}
      </h2>
      <Cards>
        {props.examples.items.map((project, i) => {
          return (
            <Card
              key={i}
              title={project.text}
              href={project.link}
              icon={proExamplesList.includes(project.text) && <ProBadge />}
              authorName={project.author}
              authorImage={`https://github.com/${project.author}.png`}
            />
          );
        })}
      </Cards>
    </>
  );
}

export function ExampleList(props: any) {
  return EXAMPLES_LIST.map((group) => (
    <ExampleGroup key={group.text} examples={group} />
  ));
}
