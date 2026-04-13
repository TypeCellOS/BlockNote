import {
  ExampleData,
  exampleGroupsData,
} from "@/components/example/generated/exampleGroupsData.gen";

export function getExampleData(
  exampleGroupName: string,
  exampleName: string,
): ExampleData {
  const exampleData = exampleGroupsData
    .find((exampleGroup) => exampleGroup.exampleGroupName === exampleGroupName)
    ?.examplesData.find((example) => example.exampleName === exampleName);

  if (!exampleData) {
    throw new Error(
      `Example ${exampleGroupName}/${exampleName} could not be found in exampleGroupsData.gen.ts. Either an invalid example/group name was provided, or something went wrong when generating the exampleGroupsData.gen.ts file.`,
    );
  }

  return exampleData;
}
