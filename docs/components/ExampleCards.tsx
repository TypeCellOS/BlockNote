import { Card, Cards } from "fumadocs-ui/components/card";
import { Heading } from "fumadocs-ui/components/heading";

import { exampleGroupsData } from "./example/generated/exampleGroupsData.gen";
import { Fragment } from "react";
import { ProBadge } from "./ProBadge";

export default function ExampleCards() {
  return (
    <>
      {exampleGroupsData.map((exampleGroupData) => (
        <Fragment key={exampleGroupData.exampleGroupName}>
          <Heading as="h2" key={exampleGroupData.exampleGroupName + "-heading"}>
            {exampleGroupData.title}
          </Heading>
          <Cards
            key={exampleGroupData.exampleGroupName + "-cards"}
            className="mb-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          >
            {exampleGroupData.examplesData.map((exampleData) => (
              <Card
                className="@max-lg:col-span-1"
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
                title={
                  <span>
                    <span className="mr-1">{exampleData.title}</span>
                    {exampleData.isPro && <ProBadge />}
                  </span>
                }
                description={
                  exampleData.author ? `by ${exampleData.author}` : undefined
                }
                href={`examples/${exampleGroupData.exampleGroupName}/${exampleData.exampleName}`}
                external={false}
              />
            ))}
          </Cards>
        </Fragment>
      ))}
    </>
  );
}
