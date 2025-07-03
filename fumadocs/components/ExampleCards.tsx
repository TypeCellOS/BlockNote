import { Card, Cards } from "fumadocs-ui/components/card";
import { Heading } from "fumadocs-ui/components/heading";

import { exampleGroupsData } from "./example/generated/exampleGroupsData.gen";

export default function ExampleCards() {
  return (
    <>
      {exampleGroupsData.map((exampleGroupData) => (
        <>
          <Heading as="h2" key={exampleGroupData.exampleGroupName + "-heading"}>
            {exampleGroupData.title}
          </Heading>
          <Cards
            key={exampleGroupData.exampleGroupName + "-cards"}
            className="mb-8"
          >
            {exampleGroupData.examplesData.map((exampleData) => (
              <Card
                key={
                  exampleGroupData.exampleGroupName +
                  "-" +
                  exampleData.exampleName
                }
                icon={
                  exampleData.author ? (
                    <img
                      src={`https://github.com/${exampleData.author}.png`}
                      alt={exampleData.author}
                      width={32}
                    />
                  ) : undefined
                }
                title={exampleData.title}
                description={
                  exampleData.author ? `by ${exampleData.author}` : undefined
                }
                href={`${exampleGroupData.exampleGroupName}/${exampleData.exampleName}`}
              />
            ))}
          </Cards>
        </>
      ))}
    </>
  );
}
