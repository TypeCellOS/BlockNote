import { Card, Cards } from "fumadocs-ui/components/card";
import { Heading } from "fumadocs-ui/components/heading";

import { exampleGroups } from "./example/generated/exampleGroups.gen";

export default function ExampleCards() {
  return (
    <>
      {Object.entries(exampleGroups).map(([exampleGroupName, exampleGroup]) => (
        <>
          <Heading as="h2" key={exampleGroupName + "-heading"}>
            {exampleGroup.title}
          </Heading>
          <Cards key={exampleGroupName + "-cards"} className="mb-8">
            {Object.entries(exampleGroup.examples).map(
              ([exampleName, example]) => (
                <Card
                  key={exampleGroupName + "-" + exampleName}
                  icon={
                    example.author ? (
                      <img
                        src={`https://github.com/${example.author}.png`}
                        alt={example.author}
                        width={32}
                      />
                    ) : undefined
                  }
                  title={example.title}
                  description={
                    example.author ? `by ${example.author}` : undefined
                  }
                  href={`${exampleGroupName}/${exampleName}`}
                />
              ),
            )}
          </Cards>
        </>
      ))}
    </>
  );
}
