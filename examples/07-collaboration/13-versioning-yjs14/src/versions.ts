import type { VersionBlock } from "./reconcile";

/**
 * The decoded history of a real BlockNote project-status document, captured as
 * five successive versions. Each version is a full tree of {@link VersionBlock}s
 * carrying *stable* ids, so {@link applyVersion} can derive the minimal ops
 * between consecutive versions (insert / update / move / remove) rather than
 * rewriting the whole document each step.
 *
 * This data was decoded from the original Yjs snapshots; it is checked in as
 * static data so the example needs no decoder at runtime.
 */
export const VERSIONS: Record<
  "v1" | "v2" | "v3" | "v4" | "v5",
  VersionBlock[]
> = {
  v1: [
    {
      id: "initialBlockId",
      type: "heading",
      props: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "BlockNote demo",
        },
      ],
    },
    {
      id: "1bf06b34-31d2-4946-8452-fe566f82ba58",
      type: "paragraph",
    },
    {
      id: "bc9d6844-fff9-4af8-a4cb-53f42763a12c",
      type: "paragraph",
    },
    {
      id: "4161db5c-05d3-4451-a8b3-08977cd6f6a3",
      type: "heading",
      props: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Open tasks",
        },
      ],
    },
    {
      id: "c835dcfb-4e83-4b53-880f-f7fb5dc59d20",
      type: "paragraph",
    },
    {
      id: "af1023c2-50e8-4676-9b41-6a4a160d7c46",
      type: "paragraph",
    },
  ],
  v2: [
    {
      id: "initialBlockId",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Goal of document is to look at work ahead and give a status update on project planning in terms of timeline.",
        },
      ],
    },
    {
      id: "62818104-164b-4473-9760-25ffbc55937c",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "(For looking back what has been completed, there are the status updates)",
        },
      ],
    },
    {
      id: "c6c883d5-8174-4cf6-8a29-f4d2f1c81845",
      type: "heading",
      props: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Timeline overview",
        },
      ],
    },
    {
      id: "3d32d32a-ab6a-4d3d-9de0-0d831553ce12",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Original planning aimed for a beta version of suggestions and versioning in BlockNote by June 1st.",
        },
      ],
    },
    {
      id: "a91a9df4-a5bf-4429-8c1d-e87af0f588b0",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Status",
          styles: {
            bold: true,
          },
        },
        {
          type: "text",
          text: ": missed target 🔴 ",
        },
      ],
    },
    {
      id: "504bdf5b-5c9c-4435-bd08-d52333d68a7e",
      type: "heading",
      props: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Schema compatibility",
        },
      ],
    },
    {
      id: "1bf06b34-31d2-4946-8452-fe566f82ba58",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: 'The main roadblock we\'re facing at this moment is the current approach to showing "diffs" (critical for both versioning and suggestions) in y-prosemirror developed so-far is incompatible with certain features of Prosemirror: complex schemas. ',
        },
      ],
    },
    {
      id: "cf5fadc8-e2be-45fc-b03f-376533c12af7",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "BlockNote uses a relatively advanced schema to represent nested blocks (child blocks) and thus, we're running into issues setting up a BlockNote demo that goes beyond the basics.",
        },
      ],
    },
    {
      id: "5bd6bff7-42b7-4dce-a6b3-4a67e4449e68",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "Technical explanation",
        },
      ],
    },
    {
      id: "bc9d6844-fff9-4af8-a4cb-53f42763a12c",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "When a user changes a paragraph to a heading, y-prosemirror wants to change the Prosemirror state to the following:",
        },
      ],
    },
    {
      id: "8260bb80-3022-421c-b1fe-050ba69f7234",
      type: "paragraph",
    },
    {
      id: "bbff29b1-4261-4980-bf9a-0b2a29f43317",
      type: "codeBlock",
      props: {
        language: "javascript",
      },
      content: [
        {
          type: "text",
          text: "<blockcontainer>\n<heading old>Text</heading>\n<paragraph new>Text</paragraph>\n</blockcontainer>",
        },
      ],
    },
    {
      id: "ba0e68ad-93ca-4e15-8848-01d9fbbcf521",
      type: "paragraph",
    },
    {
      id: "56b0796a-afae-4dc3-a35a-9f4f006cd566",
      type: "paragraph",
    },
    {
      id: "3608d0e2-a750-4849-bf8a-d0afa41ce444",
      type: "paragraph",
    },
    {
      id: "79eed386-42a1-4040-86f6-c97b1c0f2310",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "However, this is not allowed in the BlockNote Prosemirror schema, because ",
        },
        {
          type: "text",
          text: "blockcontainer",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " can only contain ",
        },
        {
          type: "text",
          text: "blockContent blockgroup?",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " (paragraph and heading are blockContent, blockgroup is optional in case there are child blocks). I.e.: a ",
        },
        {
          type: "text",
          text: "BlockContainer",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " is allowed to only contain a single node like heading / paragraph.",
        },
      ],
    },
    {
      id: "b1111058-0cac-4256-b575-9c986d8b8745",
      type: "paragraph",
    },
    {
      id: "ac2d4c00-0f0e-4593-b603-8f21f969186a",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The past +-2 weeks we've explored several ways to work around these issues (see ",
        },
        {
          type: "link",
          href: "https://docs.blocknotejs.mosacloud.eu/docs/d4846e43-a647-42ba-ab14-b9f6031437c3/",
          content: [
            {
              type: "text",
              text: "doc",
              styles: {},
            },
          ],
        },
        {
          type: "text",
          text: "). Broadly, remedies come down to:",
        },
      ],
    },
    {
      id: "aa70b19a-d0b8-44c1-ac1f-a1049a057227",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "A: Change architecture of BlockNote",
        },
      ],
    },
    {
      id: "82e90c8a-d18b-4847-a17a-46d7abc7b78a",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: 'Change BlockNote in such a way that we relax the schema so "diffing nodes" (',
        },
        {
          type: "text",
          text: "heading old",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " in the example) are allowed in the document. For example, we could:",
        },
      ],
    },
    {
      id: "d7009d83-7fd6-4611-92ea-50f8141051c8",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: 'Allow special "diffing nodes" within blockContainer',
        },
      ],
    },
    {
      id: "3fddd740-1615-4fd9-bf27-a044ce7dc394",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Flatten the BlockNote PM schema as much as possible. For example, instead of using a tree-based structure to represent children / nesting, keep blocks in a flat array and use an ",
        },
        {
          type: "text",
          text: "indentation",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " for nesting",
        },
      ],
      children: [
        {
          id: "893ef8a9-a4b3-4346-8d5b-85a8c2fab90e",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "(this might actually have other benefits in terms of conflict-resolution or the ability to do word / google docs style multi-tab indentation)",
            },
          ],
        },
      ],
    },
    {
      id: "a468194d-5c50-48c7-a6c4-c9ca3d9c2b66",
      type: "paragraph",
    },
    {
      id: "e5fb5ec6-a5a7-4b8e-b3ff-2e01804c80ce",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "While feasible, this would affect almost all parts of the code base that interact with Prosemirror nodes, and would likely be a multi-week refactor.",
        },
      ],
    },
    {
      id: "9b328ccb-a58c-4804-a13c-3cdd615235cd",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "B: Change architecture of binding",
        },
      ],
    },
    {
      id: "43dd66b5-ecf0-4838-b139-df511598d0d1",
      type: "paragraph",
    },
    {
      id: "0a474fef-8e96-4913-8f08-f26bb90e7dbd",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Instead of having y-prosemirror output diffing information directly in the Prosemirror state, information about diffs would be emitted as metadata separately. The editor (BlockNote) will then be responsible for rendering the diffs, likely using Prosemirror decorations.",
        },
      ],
    },
    {
      id: "2625a3f7-122b-46c8-bed7-703707630275",
      type: "paragraph",
    },
    {
      id: "95701bcc-72b4-4111-9b43-363603bd51da",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This is a major architectural shift from how y-prosemirror currently works. Estimated effort: ???",
        },
      ],
    },
    {
      id: "35ee260e-7b74-430b-a3bc-a59b507b0481",
      type: "paragraph",
    },
    {
      id: "5a2ba2d1-e34c-4b88-a19e-820469913404",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "There would also be some downsides. For example, it's not feasible to allow typing / formatting content that's marked as deleted in this case (something that's possible in other software, though we can challenge how valuable it is?)",
        },
      ],
    },
    {
      id: "7e452494-ec6a-42dd-b6c2-3c4d659572fc",
      type: "paragraph",
    },
    {
      id: "614dd3ae-6a51-4694-bcc7-7f616d19e0c1",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Pros:",
        },
      ],
    },
    {
      id: "cd742d02-63f2-48a3-a8f1-dd87aab04d0d",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Consumers don't need to change schema",
        },
      ],
    },
    {
      id: "48c0afec-90b3-4cd1-a75e-b188eefc9612",
      type: "paragraph",
    },
    {
      id: "f627747c-b25d-4918-8fc1-b3fcb0ad9d98",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Cons:",
        },
      ],
    },
    {
      id: "66368e55-a4d1-4618-9f53-4dc0829bce5c",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Can't edit deleted content",
        },
      ],
    },
    {
      id: "0bde15ed-8569-4149-a769-ec5bced4d956",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "No cursors in deleted content",
        },
      ],
    },
    {
      id: "678a0e9b-3db7-434a-a395-30a4d102ed1c",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Need to render all attributed content separately (transform to dom)",
        },
      ],
    },
    {
      id: "29ed238e-ff18-4dc3-b3c0-ce0560442532",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "BlockNote has little control over how content is rendered",
        },
      ],
    },
    {
      id: "033bc3e1-c876-4594-9e98-681989301dcc",
      type: "paragraph",
    },
    {
      id: "d7d7f768-5619-496a-9845-7b8ef49b75f1",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "C: Use current architecture, but control where diffs are rendered",
        },
      ],
    },
    {
      id: "151c0cc8-2782-4b4f-a995-92c80692aadb",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Before choosing option A or B, we can explore alternatives that use the current architecture of both y-prosemirror and BlockNote.",
        },
      ],
    },
    {
      id: "d6cabd24-09c9-4fd4-becd-8516cf77725a",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This is currently WIP",
          styles: {
            italic: true,
          },
        },
      ],
    },
    {
      id: "6242b56a-5f2c-4f47-b71e-b9b5de6b0769",
      type: "paragraph",
    },
    {
      id: "a97ea356-1d8f-4881-aae7-3ae39a76d54d",
      type: "paragraph",
    },
    {
      id: "d747a50e-577f-4fef-8986-34087444f091",
      type: "heading",
      props: {
        level: 4,
      },
      content: [
        {
          type: "text",
          text: "yjs <-> PM custom transforms",
        },
      ],
    },
    {
      id: "71790421-d87a-4fda-8750-5918ecb30de9",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Pros:",
        },
      ],
    },
    {
      id: "613a6bc8-2df0-4a81-be5d-844672405634",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Likely a good solution to the problem without too much overhaul",
        },
      ],
    },
    {
      id: "1c597102-4c8a-42fb-8161-547ce78b3327",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: 'Can improve "conflict resolution" of some other operations (e.g.: multiple users create a child block)',
        },
      ],
    },
    {
      id: "09c694da-9118-43a6-8ca6-efc99f72d18c",
      type: "paragraph",
    },
    {
      id: "c730ff68-41bd-4817-b5b7-d61cdb10b291",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Cons:",
        },
      ],
    },
    {
      id: "195f16d9-5d4f-48ac-89a2-9a02c457b28f",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Need to be very delicate about how to allow this functionality (how to expose it from y-prosemirror)",
        },
      ],
      children: [
        {
          id: "77124308-3a25-4204-a22c-bd8d64f96b31",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "For example: only allow transforming certain nodes in a safe manner: e.g. ",
            },
            {
              type: "text",
              text: "<paragraph />",
              styles: {
                code: true,
              },
            },
            {
              type: "text",
              text: " ↦ ",
            },
            {
              type: "text",
              text: '<_block type="paragraph"',
              styles: {
                code: true,
              },
            },
            {
              type: "text",
              text: " .",
            },
          ],
        },
      ],
    },
    {
      id: "927b24ee-8c08-4262-95a1-315a52cadf47",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Requires data migration",
        },
      ],
    },
    {
      id: "614285cb-2e36-44a5-81fa-75268f9a9976",
      type: "paragraph",
    },
    {
      id: "469eb25c-0bac-4744-9d98-1d0d3b1354f1",
      type: "paragraph",
    },
    {
      id: "1a0b96f9-b364-4264-a1c9-b93de53191a2",
      type: "paragraph",
    },
    {
      id: "5e72c1e9-1cfe-47cb-8db1-d155a5284e4e",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: " ",
        },
      ],
    },
    {
      id: "4161db5c-05d3-4451-a8b3-08977cd6f6a3",
      type: "heading",
      props: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Open tasks",
        },
      ],
    },
    {
      id: "62986f28-3a36-4702-83f8-194a6a805dc0",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The currently scoped remaining work has been categorized in 5 phases:",
        },
      ],
    },
    {
      id: "bd772ad8-b12d-42d2-8082-be58366cbc3b",
      type: "paragraph",
    },
    {
      id: "de0e3f48-8b39-44f4-8766-c8344dc97d79",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "1: Demo readiness",
        },
      ],
    },
    {
      id: "cf5b7f55-53fe-4847-9ff9-2adff6beeee6",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Demo+readiness%22",
          content: [
            {
              type: "text",
              text: "View Issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "4cd9804b-f320-4cfe-83a2-a25c46066104",
      type: "paragraph",
    },
    {
      id: "6ca5e395-6654-4b05-b616-ef3bcdf96239",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Get the current work to a demoable and testable state",
        },
      ],
    },
    {
      id: "c009551c-2f98-4ea8-8654-404e6b7444ac",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "66971ae0-91f7-4c42-9c23-2e679527ab45",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "schema compatibility",
            },
          ],
        },
        {
          id: "c9ca8f7f-3a08-46cb-90bc-dc5696d7f260",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "TO DISCUSS",
            },
          ],
        },
      ],
    },
    {
      id: "a8bef0dc-6061-4141-aa62-7fdf9a15ce2a",
      type: "paragraph",
    },
    {
      id: "0b33469a-e047-4e86-846f-ee820583ce82",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "2: Stability",
        },
      ],
    },
    {
      id: "58b960dd-d5f8-4af3-a8a7-37ffaebd3611",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Stability+%28diffs+%2F+versions%29%22",
          content: [
            {
              type: "text",
              text: "View Issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "040949d3-65c5-43e6-ae57-a8f27c5c9f73",
      type: "paragraph",
    },
    {
      id: "7937911d-a79c-4774-af90-67b342c7fa23",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Fix known issues in the current y-prosemirror binding",
        },
      ],
    },
    {
      id: "0d7025db-3eb1-4bfc-b693-e885b4d60390",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "ce732233-9a30-44ee-8c8c-66340ae3c121",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Add support for Table diffs to BlockNote and y-prosemirror",
            },
          ],
          children: [
            {
              id: "df7e6725-2bb8-4ce0-b84c-e36f8586bde6",
              type: "bulletListItem",
              content: [
                {
                  type: "text",
                  text: "This has some unknowns and potentially needs a number of changes to ",
                },
                {
                  type: "text",
                  text: "prosemirror-tables",
                  styles: {
                    code: true,
                  },
                },
              ],
            },
          ],
        },
        {
          id: "18b5622c-76e3-4e41-9659-820801967147",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Potential new items after testing demo",
            },
          ],
        },
        {
          id: "5bc10985-b891-4217-8dd5-45d53a477cf9",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "TO DISCUSS",
            },
          ],
        },
      ],
    },
    {
      id: "234b4ee0-0024-4dea-86bf-47b961c8dd6f",
      type: "paragraph",
    },
    {
      id: "f2eb1b59-3909-4a6c-af47-b31662cabeae",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "3: BlockNote level features",
        },
      ],
    },
    {
      id: "a959c626-b4bc-4efa-af6e-b15aedb177b6",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Implement history panel",
        },
      ],
    },
    {
      id: "14138376-912f-428f-ab74-643652c6bb62",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: 'Update BlockNote APIs and documentation, make existing BlockNote APIs compatible with "diff views"',
        },
      ],
    },
    {
      id: "69af46e1-d7c2-436f-8bae-dae836d3ae96",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "6787c2bc-28d5-4cf6-9bb0-1d05aceefddb",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "none at this moment",
            },
          ],
        },
        {
          id: "37fa84cf-570a-411a-9e96-c9e3bc9113d0",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "TO DISCUSS",
            },
          ],
        },
      ],
    },
    {
      id: "81363d76-5daa-44f1-ac79-61b967f193db",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "4: Rollout",
        },
      ],
    },
    {
      id: "ae6ac180-2492-41c6-9abb-2ae4dc00d4df",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Release+%2F+rollout%22",
          content: [
            {
              type: "text",
              text: "View issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "4e3ee5c0-c2b5-4258-880e-da5b418e9826",
      type: "paragraph",
    },
    {
      id: "c6c65714-7d1b-43fc-8d23-5f6a452b4f18",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Migration guide",
        },
      ],
    },
    {
      id: "361cbb94-ec74-482a-8c08-e2b938183064",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Release of y-prosemirror",
        },
      ],
    },
    {
      id: "2eed8480-da1e-4f64-90ba-3ccf6a9df08f",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Release of BlockNote with (optional) new Yjs / y-prosemirror compatibility",
        },
      ],
    },
    {
      id: "19b84b6a-5c1e-4637-917f-57282cff6612",
      type: "paragraph",
    },
    {
      id: "e350b6ae-c8ff-4968-9149-419b08328923",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "5f7423fe-81d4-4a5b-8c1e-b9797308ec2b",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "none at this moment",
            },
          ],
        },
        {
          id: "b5eab023-1223-4fd9-817f-3dbca47c5e7d",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "TO DISCUSS",
            },
          ],
        },
      ],
    },
    {
      id: "eade368f-5d90-49d6-b012-42e873d2dddf",
      type: "paragraph",
    },
    {
      id: "ab044a82-f38c-459a-99c7-342bb176e556",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "5: Suggestions",
        },
      ],
    },
    {
      id: "0e9ae6b9-85b1-4164-a137-e14323edb349",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Suggestions+%28track+changes%29%22",
          content: [
            {
              type: "text",
              text: "View issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "2b12f097-fe31-43dd-97db-6bea1e33dfa2",
      type: "paragraph",
    },
    {
      id: "e8cca260-bc7e-4a2c-834d-89a7d337e336",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Specific features related to suggestions / track changes.",
        },
      ],
    },
    {
      id: "116548de-8362-432b-af2c-af2702e16d5e",
      type: "paragraph",
    },
    {
      id: "6476312d-aa12-4e5b-a093-bd36b90fddca",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "357f34c3-599e-4068-a196-83cc6930f2f0",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "bugs in typing / editing suggestions",
            },
          ],
        },
        {
          id: "3d5f3c55-5c98-4cd2-8aab-e0160df3859f",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "commenting on suggestions / sidebar",
            },
          ],
        },
        {
          id: "e9420d7f-a9df-4491-ae92-72d95725010a",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "TO DISCUSS",
            },
          ],
        },
      ],
    },
    {
      id: "c7e9c438-e13c-4a3d-811e-f057c53dc3cf",
      type: "paragraph",
    },
  ],
  v3: [
    {
      id: "initialBlockId",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Goal of document is to look at work ahead and give a status update on project planning in terms of timeline.",
        },
      ],
    },
    {
      id: "62818104-164b-4473-9760-25ffbc55937c",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "(For looking back what has been completed, there are the status updates)",
        },
      ],
    },
    {
      id: "c6c883d5-8174-4cf6-8a29-f4d2f1c81845",
      type: "heading",
      props: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Timeline overview",
        },
      ],
    },
    {
      id: "3d32d32a-ab6a-4d3d-9de0-0d831553ce12",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Original planning aimed for a beta version of suggestions and versioning in BlockNote by June 1st.",
        },
      ],
    },
    {
      id: "a91a9df4-a5bf-4429-8c1d-e87af0f588b0",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Status",
          styles: {
            bold: true,
          },
        },
        {
          type: "text",
          text: ": missed target 🔴 ",
        },
      ],
    },
    {
      id: "b3558b5b-a480-4a01-a279-69d7df6978b2",
      type: "paragraph",
    },
    {
      id: "3a4d7e08-998c-48e8-bae1-664e8aaf9068",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "TODO: what's new timeline?",
        },
      ],
    },
    {
      id: "504bdf5b-5c9c-4435-bd08-d52333d68a7e",
      type: "heading",
      props: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Schema compatibility",
        },
      ],
    },
    {
      id: "1bf06b34-31d2-4946-8452-fe566f82ba58",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: 'The main roadblock we\'re facing at this moment is the current approach to showing "diffs" (critical for both versioning and suggestions) in y-prosemirror developed so-far is incompatible with certain features of Prosemirror: complex schemas. ',
        },
      ],
    },
    {
      id: "cf5fadc8-e2be-45fc-b03f-376533c12af7",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "BlockNote uses a relatively advanced schema to represent nested blocks (child blocks) and thus, we're running into issues setting up a BlockNote demo that goes beyond the basics.",
        },
      ],
    },
    {
      id: "5bd6bff7-42b7-4dce-a6b3-4a67e4449e68",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "Technical explanation",
        },
      ],
    },
    {
      id: "bc9d6844-fff9-4af8-a4cb-53f42763a12c",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "When a user changes a paragraph to a heading, y-prosemirror wants to change the Prosemirror state to the following:",
        },
      ],
    },
    {
      id: "8260bb80-3022-421c-b1fe-050ba69f7234",
      type: "paragraph",
    },
    {
      id: "bbff29b1-4261-4980-bf9a-0b2a29f43317",
      type: "codeBlock",
      props: {
        language: "javascript",
      },
      content: [
        {
          type: "text",
          text: "<blockcontainer>\n<heading old>Text</heading>\n<paragraph new>Text</paragraph>\n</blockcontainer>",
        },
      ],
    },
    {
      id: "ba0e68ad-93ca-4e15-8848-01d9fbbcf521",
      type: "paragraph",
    },
    {
      id: "79eed386-42a1-4040-86f6-c97b1c0f2310",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "However, this is not allowed in the BlockNote Prosemirror schema, because ",
        },
        {
          type: "text",
          text: "blockcontainer",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " can only contain ",
        },
        {
          type: "text",
          text: "blockContent blockgroup?",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " (paragraph and heading are blockContent, blockgroup is optional in case there are child blocks). I.e.: a ",
        },
        {
          type: "text",
          text: "BlockContainer",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " is allowed to only contain a single node like heading / paragraph.",
        },
      ],
    },
    {
      id: "b1111058-0cac-4256-b575-9c986d8b8745",
      type: "paragraph",
    },
    {
      id: "ac2d4c00-0f0e-4593-b603-8f21f969186a",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The past +-2 weeks we've explored several ways to work around these issues (see ",
        },
        {
          type: "link",
          href: "https://docs.blocknotejs.mosacloud.eu/docs/d4846e43-a647-42ba-ab14-b9f6031437c3/",
          content: [
            {
              type: "text",
              text: "doc",
              styles: {},
            },
          ],
        },
        {
          type: "text",
          text: "). Broadly, remedies come down to:",
        },
      ],
    },
    {
      id: "4a7e88d5-e945-421e-bb9b-0901856aca75",
      type: "paragraph",
    },
    {
      id: "aa70b19a-d0b8-44c1-ac1f-a1049a057227",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "A: Change architecture of BlockNote",
        },
      ],
    },
    {
      id: "82e90c8a-d18b-4847-a17a-46d7abc7b78a",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: 'Change BlockNote in such a way that we relax the schema so "diffing nodes" (',
        },
        {
          type: "text",
          text: "heading old",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " in the example) are allowed in the document. For example, we could:",
        },
      ],
    },
    {
      id: "d7009d83-7fd6-4611-92ea-50f8141051c8",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: 'Allow special "diffing nodes" within blockContainer',
        },
      ],
    },
    {
      id: "3fddd740-1615-4fd9-bf27-a044ce7dc394",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Flatten the BlockNote PM schema as much as possible. For example, instead of using a tree-based structure to represent children / nesting, keep blocks in a flat array and use an ",
        },
        {
          type: "text",
          text: "indentation",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " for nesting",
        },
      ],
      children: [
        {
          id: "893ef8a9-a4b3-4346-8d5b-85a8c2fab90e",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "(this might actually have other benefits in terms of conflict-resolution or the ability to do word / google docs style multi-tab indentation)",
            },
          ],
        },
      ],
    },
    {
      id: "a468194d-5c50-48c7-a6c4-c9ca3d9c2b66",
      type: "paragraph",
    },
    {
      id: "e5fb5ec6-a5a7-4b8e-b3ff-2e01804c80ce",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "While feasible, this would affect almost all parts of the code base that interact with Prosemirror nodes, and would likely be a multi-week refactor.",
        },
      ],
    },
    {
      id: "9b328ccb-a58c-4804-a13c-3cdd615235cd",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "B: Change architecture of binding",
        },
      ],
    },
    {
      id: "0a474fef-8e96-4913-8f08-f26bb90e7dbd",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Instead of having y-prosemirror output diffing information directly in the Prosemirror state, information about diffs would be emitted as metadata separately. The editor (BlockNote) will then be responsible for rendering the diffs, likely using Prosemirror decorations.",
        },
      ],
    },
    {
      id: "2625a3f7-122b-46c8-bed7-703707630275",
      type: "paragraph",
    },
    {
      id: "95701bcc-72b4-4111-9b43-363603bd51da",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This is a major architectural shift from how y-prosemirror currently works. Estimated effort: ???",
        },
      ],
    },
    {
      id: "35ee260e-7b74-430b-a3bc-a59b507b0481",
      type: "paragraph",
    },
    {
      id: "5a2ba2d1-e34c-4b88-a19e-820469913404",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "There would also be some downsides. For example, it's not feasible to allow typing / formatting content that's marked as deleted in this case (something that's possible in other software, though we can challenge how valuable it is?)",
        },
      ],
    },
    {
      id: "7e452494-ec6a-42dd-b6c2-3c4d659572fc",
      type: "paragraph",
    },
    {
      id: "614dd3ae-6a51-4694-bcc7-7f616d19e0c1",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Pros:",
        },
      ],
    },
    {
      id: "cd742d02-63f2-48a3-a8f1-dd87aab04d0d",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Consumers don't need to change schema",
        },
      ],
      children: [
        {
          id: "839bedaa-5c25-4e47-a5bc-3fa80f53c632",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "just works for everyone",
            },
          ],
        },
      ],
    },
    {
      id: "48c0afec-90b3-4cd1-a75e-b188eefc9612",
      type: "paragraph",
    },
    {
      id: "f627747c-b25d-4918-8fc1-b3fcb0ad9d98",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Cons:",
        },
      ],
    },
    {
      id: "66368e55-a4d1-4618-9f53-4dc0829bce5c",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Can't edit deleted content",
          styles: {
            bold: true,
          },
        },
      ],
    },
    {
      id: "0bde15ed-8569-4149-a769-ec5bced4d956",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "No cursors in deleted content",
          styles: {
            bold: true,
          },
        },
      ],
    },
    {
      id: "f8646c47-b339-4746-a93b-855071dfa16f",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Not possible to comment on deleted content",
          styles: {
            bold: true,
          },
        },
      ],
    },
    {
      id: "12ab366f-fc07-4927-9d5b-d25efb2228ae",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "tables?",
        },
      ],
    },
    {
      id: "678a0e9b-3db7-434a-a395-30a4d102ed1c",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Need to render all attributed content separately (transform to dom)",
        },
      ],
    },
    {
      id: "d7d7f768-5619-496a-9845-7b8ef49b75f1",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "C: Use current architecture, but control where diffs are rendered",
        },
      ],
    },
    {
      id: "151c0cc8-2782-4b4f-a995-92c80692aadb",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Before choosing option A or B, we can explore alternatives that use the current architecture of both y-prosemirror and BlockNote.",
        },
      ],
    },
    {
      id: "d6cabd24-09c9-4fd4-becd-8516cf77725a",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This is currently WIP",
          styles: {
            italic: true,
          },
        },
      ],
    },
    {
      id: "a97ea356-1d8f-4881-aae7-3ae39a76d54d",
      type: "paragraph",
    },
    {
      id: "d747a50e-577f-4fef-8986-34087444f091",
      type: "heading",
      props: {
        level: 4,
      },
      content: [
        {
          type: "text",
          text: "yjs <-> PM custom transforms",
        },
      ],
    },
    {
      id: "71790421-d87a-4fda-8750-5918ecb30de9",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Pros:",
        },
      ],
    },
    {
      id: "613a6bc8-2df0-4a81-be5d-844672405634",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Likely a good solution to the problem without too much overhaul",
        },
      ],
    },
    {
      id: "1c597102-4c8a-42fb-8161-547ce78b3327",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: 'Can improve "conflict resolution" of some other operations (e.g.: multiple users create a child block)',
        },
      ],
    },
    {
      id: "09c694da-9118-43a6-8ca6-efc99f72d18c",
      type: "paragraph",
    },
    {
      id: "c730ff68-41bd-4817-b5b7-d61cdb10b291",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Cons:",
        },
      ],
    },
    {
      id: "195f16d9-5d4f-48ac-89a2-9a02c457b28f",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Need to be very delicate about how to allow this functionality (how to expose it from y-prosemirror)",
        },
      ],
      children: [
        {
          id: "77124308-3a25-4204-a22c-bd8d64f96b31",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "For example: only allow transforming certain nodes in a safe manner: e.g. ",
            },
            {
              type: "text",
              text: "<paragraph />",
              styles: {
                code: true,
              },
            },
            {
              type: "text",
              text: " ↦ ",
            },
            {
              type: "text",
              text: '<_block type="paragraph"',
              styles: {
                code: true,
              },
            },
            {
              type: "text",
              text: " .",
            },
          ],
        },
      ],
    },
    {
      id: "927b24ee-8c08-4262-95a1-315a52cadf47",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Requires data migration",
        },
      ],
    },
    {
      id: "5e72c1e9-1cfe-47cb-8db1-d155a5284e4e",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: " ",
        },
      ],
    },
    {
      id: "4161db5c-05d3-4451-a8b3-08977cd6f6a3",
      type: "heading",
      props: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Open tasks",
        },
      ],
    },
    {
      id: "62986f28-3a36-4702-83f8-194a6a805dc0",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The currently scoped remaining work has been categorized in 5 phases:",
        },
      ],
    },
    {
      id: "bd772ad8-b12d-42d2-8082-be58366cbc3b",
      type: "paragraph",
    },
    {
      id: "de0e3f48-8b39-44f4-8766-c8344dc97d79",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "1: Demo readiness",
        },
      ],
    },
    {
      id: "cf5b7f55-53fe-4847-9ff9-2adff6beeee6",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Demo+readiness%22",
          content: [
            {
              type: "text",
              text: "View Issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "4cd9804b-f320-4cfe-83a2-a25c46066104",
      type: "paragraph",
    },
    {
      id: "6ca5e395-6654-4b05-b616-ef3bcdf96239",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Get the current work to a demoable and testable state",
        },
      ],
    },
    {
      id: "c009551c-2f98-4ea8-8654-404e6b7444ac",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "66971ae0-91f7-4c42-9c23-2e679527ab45",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "schema compatibility",
            },
          ],
        },
        {
          id: "d328f8ed-1a83-489c-bca4-79bdf044fbac",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Add support for Table diffs to BlockNote and y-prosemirror",
            },
          ],
          children: [
            {
              id: "f2d81783-ccb4-4d65-b94c-11c168899607",
              type: "bulletListItem",
              content: [
                {
                  type: "text",
                  text: "This has some unknowns and potentially needs a number of changes to ",
                },
                {
                  type: "text",
                  text: "prosemirror-tables",
                  styles: {
                    code: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "c9ca8f7f-3a08-46cb-90bc-dc5696d7f260",
      type: "paragraph",
    },
    {
      id: "e41f3d25-e219-4b3c-9f4b-faf64ba214d4",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Estimate: depends on schema next step",
        },
      ],
    },
    {
      id: "0b33469a-e047-4e86-846f-ee820583ce82",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "2: Stability",
        },
      ],
    },
    {
      id: "58b960dd-d5f8-4af3-a8a7-37ffaebd3611",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Stability+%28diffs+%2F+versions%29%22",
          content: [
            {
              type: "text",
              text: "View Issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "040949d3-65c5-43e6-ae57-a8f27c5c9f73",
      type: "paragraph",
    },
    {
      id: "7937911d-a79c-4774-af90-67b342c7fa23",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Fix known issues in the current y-prosemirror binding",
        },
      ],
    },
    {
      id: "0d7025db-3eb1-4bfc-b693-e885b4d60390",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "y-prosemirror at level that it's comfortable to release as new major version",
          styles: {
            bold: true,
          },
        },
      ],
    },
    {
      id: "0981d2e1-9ab3-48f8-b1a1-4365a548b2b8",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "TODO Biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "18b5622c-76e3-4e41-9659-820801967147",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Potential new items after testing demo",
            },
          ],
        },
        {
          id: "5bc10985-b891-4217-8dd5-45d53a477cf9",
          type: "paragraph",
        },
      ],
    },
    {
      id: "e67ccfc3-10c1-4fb1-80a8-f0ffaf03ff91",
      type: "paragraph",
    },
    {
      id: "625026e4-198e-4ad7-ab64-f884e82aaf9a",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Initial estimate Kevin: 5-8 days + ??? for unknowns",
        },
      ],
    },
    {
      id: "19c4f7cb-0c2e-4fe7-b25c-af9f31fb0aba",
      type: "paragraph",
    },
    {
      id: "eea91bef-61f2-4ac8-9d2c-559fdc528a30",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "2 XS",
        },
      ],
    },
    {
      id: "5e3740c6-cee0-4e53-a6c0-8c55a7864ce5",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "2 S",
        },
      ],
    },
    {
      id: "1cc8ee7b-0e9d-43bd-9f10-68e5e2295b73",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "3 M",
        },
      ],
    },
    {
      id: "8b19fecc-ceed-4139-99dd-5bac14990fd4",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "1 L",
        },
      ],
    },
    {
      id: "2e1b9234-38a5-4e07-98b3-1c2196054d88",
      type: "paragraph",
    },
    {
      id: "5b16f492-2b25-400c-987b-97b8a5eb4c90",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Counted estimate: 2+(3-6)+(2-5) = 6-13 days + ??? for unknowns",
        },
      ],
    },
    {
      id: "f2eb1b59-3909-4a6c-af47-b31662cabeae",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "3: BlockNote level features",
        },
      ],
    },
    {
      id: "49904179-8e10-4770-9587-524966c4581c",
      type: "paragraph",
    },
    {
      id: "a959c626-b4bc-4efa-af6e-b15aedb177b6",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Implement history panel",
        },
      ],
    },
    {
      id: "14138376-912f-428f-ab74-643652c6bb62",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: 'Update BlockNote APIs and documentation, make existing BlockNote APIs compatible with "diff views"',
        },
      ],
    },
    {
      id: "69af46e1-d7c2-436f-8bae-dae836d3ae96",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "6787c2bc-28d5-4cf6-9bb0-1d05aceefddb",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "none at this moment",
            },
          ],
        },
      ],
    },
    {
      id: "37fa84cf-570a-411a-9e96-c9e3bc9113d0",
      type: "paragraph",
    },
    {
      id: "a450596d-8901-4712-8f3c-d4425a53d72b",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "1 L",
        },
      ],
    },
    {
      id: "540c68ec-944b-45a0-9f79-4e1591b98af1",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "2 M",
        },
      ],
    },
    {
      id: "f89a92e8-6742-416f-af07-b65c099b7718",
      type: "paragraph",
    },
    {
      id: "859ed9e8-be8d-4582-ac11-f7195a5f1f7c",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "= 4-9 days",
        },
      ],
    },
    {
      id: "2cb75462-1df9-4f94-bf7b-4ebb3de96fbb",
      type: "paragraph",
    },
    {
      id: "81363d76-5daa-44f1-ac79-61b967f193db",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "4: Rollout",
        },
      ],
    },
    {
      id: "ae6ac180-2492-41c6-9abb-2ae4dc00d4df",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Release+%2F+rollout%22",
          content: [
            {
              type: "text",
              text: "View issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "4e3ee5c0-c2b5-4258-880e-da5b418e9826",
      type: "paragraph",
    },
    {
      id: "c6c65714-7d1b-43fc-8d23-5f6a452b4f18",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Migration guide",
        },
      ],
    },
    {
      id: "361cbb94-ec74-482a-8c08-e2b938183064",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Stable release of y-prosemirror + yjs + lib0",
        },
      ],
      children: [
        {
          id: "d010e74c-d72f-4d11-9d96-fac784b9ec6a",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Planned for end of August",
            },
          ],
        },
      ],
    },
    {
      id: "2eed8480-da1e-4f64-90ba-3ccf6a9df08f",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Release of BlockNote with (optional) new Yjs / y-prosemirror compatibility",
        },
      ],
    },
    {
      id: "19b84b6a-5c1e-4637-917f-57282cff6612",
      type: "paragraph",
    },
    {
      id: "e350b6ae-c8ff-4968-9149-419b08328923",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "5f7423fe-81d4-4a5b-8c1e-b9797308ec2b",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "none at this moment",
            },
          ],
        },
      ],
    },
    {
      id: "b5eab023-1223-4fd9-817f-3dbca47c5e7d",
      type: "paragraph",
    },
    {
      id: "eade368f-5d90-49d6-b012-42e873d2dddf",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "3 M",
        },
      ],
    },
    {
      id: "569e9d88-2901-41df-acb0-f1b631012df3",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "1 S",
        },
      ],
    },
    {
      id: "1c415b65-68b1-4ab3-adf4-7e0c903a9232",
      type: "paragraph",
    },
    {
      id: "630aaf9f-de91-4643-a2af-8e47f1c67ef2",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "= 3.5 - 6.5 days",
        },
      ],
    },
    {
      id: "ab044a82-f38c-459a-99c7-342bb176e556",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "5: Suggestions",
        },
      ],
    },
    {
      id: "0e9ae6b9-85b1-4164-a137-e14323edb349",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Suggestions+%28track+changes%29%22",
          content: [
            {
              type: "text",
              text: "View issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "2b12f097-fe31-43dd-97db-6bea1e33dfa2",
      type: "paragraph",
    },
    {
      id: "e8cca260-bc7e-4a2c-834d-89a7d337e336",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Specific features related to suggestions / track changes.",
        },
      ],
    },
    {
      id: "116548de-8362-432b-af2c-af2702e16d5e",
      type: "paragraph",
    },
    {
      id: "6476312d-aa12-4e5b-a093-bd36b90fddca",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "357f34c3-599e-4068-a196-83cc6930f2f0",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "delete suggestions",
            },
          ],
        },
      ],
    },
    {
      id: "3fe5c25b-87a8-4b97-bb3f-675bce4a7848",
      type: "paragraph",
    },
    {
      id: "f2e94dbf-07ea-4f37-9a3c-438b0431618d",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "1 XL",
        },
      ],
    },
    {
      id: "d13e3a8e-8239-40fc-ba89-7a9c57af2c88",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "3 L",
        },
      ],
    },
    {
      id: "2822cf62-665d-4d82-bfe3-3e6d9b87419f",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "4 M",
        },
      ],
    },
    {
      id: "596a8524-457a-41e8-b715-042adc217db2",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "2 S",
        },
      ],
    },
    {
      id: "c24c882a-b16a-41ea-b7dd-20c057777353",
      type: "paragraph",
    },
    {
      id: "057da6a6-7b99-478e-8629-14efcad4028d",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "= (6-15)+(4-8)+1 = 11-24 days",
        },
      ],
    },
    {
      id: "359ceed1-3958-43ab-8143-73cc4f588053",
      type: "heading",
      content: [
        {
          type: "text",
          text: "Next steps",
        },
      ],
    },
    {
      id: "2ad8d758-a513-4402-9626-c1283ec39254",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Y: clean up above + count estimates",
        },
      ],
    },
    {
      id: "ca22776b-07b7-4ab2-ad9c-fd153123120a",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Y: Sync with Virgile",
        },
      ],
    },
    {
      id: "fe5335ee-132a-47c9-8a00-e1d6cc2dc095",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Decide on schema next steps",
        },
      ],
      children: [
        {
          id: "2f14a5d4-7864-4b84-82e9-a0b7f6ffe96f",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Kevin: share exploration A",
            },
          ],
        },
        {
          id: "fa6e98bf-b093-4fe8-8d17-e1c58457295b",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Y: share C",
            },
          ],
        },
        {
          id: "c88e5981-afa2-4705-b861-b1bec3ce8908",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "N: share B",
            },
          ],
        },
      ],
    },
    {
      id: "f5bbf437-ff39-4796-9b1d-0ac5a3381764",
      type: "paragraph",
    },
    {
      id: "c7e9c438-e13c-4a3d-811e-f057c53dc3cf",
      type: "paragraph",
    },
  ],
  v4: [
    {
      id: "initialBlockId",
      type: "paragraph",
    },
    {
      id: "62818104-164b-4473-9760-25ffbc55937c",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "(For looking back what has been completed, there are the status updates)",
        },
      ],
    },
    {
      id: "c6c883d5-8174-4cf6-8a29-f4d2f1c81845",
      type: "heading",
      props: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Timeline overview",
        },
      ],
    },
    {
      id: "3d32d32a-ab6a-4d3d-9de0-0d831553ce12",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Original planning aimed for a beta version of suggestions and versioning in BlockNote by June 1st.",
        },
      ],
    },
    {
      id: "a91a9df4-a5bf-4429-8c1d-e87af0f588b0",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Status",
          styles: {
            bold: true,
          },
        },
        {
          type: "text",
          text: ": missed target 🔴 ",
        },
      ],
    },
    {
      id: "b3558b5b-a480-4a01-a279-69d7df6978b2",
      type: "paragraph",
    },
    {
      id: "3a4d7e08-998c-48e8-bae1-664e8aaf9068",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "TODO: what's new timeline?",
        },
      ],
    },
    {
      id: "504bdf5b-5c9c-4435-bd08-d52333d68a7e",
      type: "heading",
      props: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Schema compatibility",
        },
      ],
    },
    {
      id: "1bf06b34-31d2-4946-8452-fe566f82ba58",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: 'The main roadblock we\'re facing at this moment is the current approach to showing "diffs" (critical for both versioning and suggestions) in y-prosemirror developed so-far is incompatible with certain features of Prosemirror: complex schemas. ',
        },
      ],
    },
    {
      id: "cf5fadc8-e2be-45fc-b03f-376533c12af7",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "BlockNote uses a relatively advanced schema to represent nested blocks (child blocks) and thus, we're running into issues setting up a BlockNote demo that goes beyond the basics.",
        },
      ],
    },
    {
      id: "5bd6bff7-42b7-4dce-a6b3-4a67e4449e68",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "Technical explanation",
        },
      ],
    },
    {
      id: "bc9d6844-fff9-4af8-a4cb-53f42763a12c",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "When a user changes a paragraph to a heading, y-prosemirror wants to change the Prosemirror state to the following:",
        },
      ],
    },
    {
      id: "8260bb80-3022-421c-b1fe-050ba69f7234",
      type: "paragraph",
    },
    {
      id: "bbff29b1-4261-4980-bf9a-0b2a29f43317",
      type: "codeBlock",
      props: {
        language: "javascript",
      },
      content: [
        {
          type: "text",
          text: "<blockcontainer>\n<heading old>Text</heading>\n<paragraph new>Text</paragraph>\n</blockcontainer>",
        },
      ],
    },
    {
      id: "ba0e68ad-93ca-4e15-8848-01d9fbbcf521",
      type: "paragraph",
    },
    {
      id: "79eed386-42a1-4040-86f6-c97b1c0f2310",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "However, this is not allowed in the BlockNote Prosemirror schema, because ",
        },
        {
          type: "text",
          text: "blockcontainer",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " can only contain ",
        },
        {
          type: "text",
          text: "blockContent blockgroup?",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " (paragraph and heading are blockContent, blockgroup is optional in case there are child blocks). I.e.: a ",
        },
        {
          type: "text",
          text: "BlockContainer",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " is allowed to only contain a single node like heading / paragraph.",
        },
      ],
    },
    {
      id: "b1111058-0cac-4256-b575-9c986d8b8745",
      type: "paragraph",
    },
    {
      id: "ac2d4c00-0f0e-4593-b603-8f21f969186a",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The past +-2 weeks we've explored several ways to work around these issues (see ",
        },
        {
          type: "link",
          href: "https://docs.blocknotejs.mosacloud.eu/docs/d4846e43-a647-42ba-ab14-b9f6031437c3/",
          content: [
            {
              type: "text",
              text: "doc",
              styles: {},
            },
          ],
        },
        {
          type: "text",
          text: "). Broadly, remedies come down to:",
        },
      ],
    },
    {
      id: "4a7e88d5-e945-421e-bb9b-0901856aca75",
      type: "paragraph",
    },
    {
      id: "aa70b19a-d0b8-44c1-ac1f-a1049a057227",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "A: Change architecture of BlockNote",
        },
      ],
    },
    {
      id: "82e90c8a-d18b-4847-a17a-46d7abc7b78a",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: 'Change BlockNote in such a way that we relax the schema so "diffing nodes" (',
        },
        {
          type: "text",
          text: "heading old",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " in the example) are allowed everywhere in the document. For example, we could:",
        },
      ],
    },
    {
      id: "d7009d83-7fd6-4611-92ea-50f8141051c8",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: 'Allow special "diffing nodes" within blockContainer',
        },
      ],
    },
    {
      id: "3fddd740-1615-4fd9-bf27-a044ce7dc394",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Flatten the BlockNote PM schema as much as possible. For example, instead of using a tree-based structure to represent children / nesting, keep blocks in a flat array and use an ",
        },
        {
          type: "text",
          text: "indentation",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " for nesting",
        },
      ],
    },
    {
      id: "a468194d-5c50-48c7-a6c4-c9ca3d9c2b66",
      type: "paragraph",
    },
    {
      id: "a5b2253a-5500-4739-87b2-0a00ac60d6c4",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Pro:",
        },
      ],
    },
    {
      id: "e46fae75-2767-4a37-a74e-4a4ba8ab3ac0",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "We could expand the refactor to have some additional benefits:",
        },
      ],
      children: [
        {
          id: "5a1636a4-ee19-4345-85d1-bade8c4130e5",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "better conflict-resolution for nesting / unnesting",
            },
          ],
        },
        {
          id: "e4270ab2-da4b-4900-b5af-6374b7c059a1",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Indent/dedent would show cleaner in diffs",
            },
          ],
        },
        {
          id: "f12ab91e-1bec-4ca3-8ec1-bbe16d54ca8a",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: 'the ability to do word / google docs style multi-tab indentation (instead of Notion-style "child" structure)',
            },
          ],
        },
      ],
    },
    {
      id: "184cb770-eccc-40aa-b29a-48a2d555b0ee",
      type: "paragraph",
    },
    {
      id: "d3c432c9-0869-45a0-8a58-a18dc7322744",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Con:",
        },
      ],
    },
    {
      id: "e5fb5ec6-a5a7-4b8e-b3ff-2e01804c80ce",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "While feasible, this would affect almost all parts of the code base that interact with Prosemirror nodes, and would likely be a multi-week refactor (rough estimate 4 weeks).",
        },
      ],
    },
    {
      id: "f9221164-b3d7-45e7-ae28-039e4cda44cb",
      type: "paragraph",
    },
    {
      id: "9b328ccb-a58c-4804-a13c-3cdd615235cd",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "B: Change architecture of binding",
        },
      ],
    },
    {
      id: "8c35ab69-b952-4715-93de-e0b48cba1690",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://blocknote-git-y-prosemirror-decorations-typecell.vercel.app/collaboration/yhub",
          content: [
            {
              type: "text",
              text: "POC Demo",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "32da9f69-df08-40f7-bc0f-6304cef85a98",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/yjs/y-prosemirror/pull/264",
          content: [
            {
              type: "text",
              text: "POC PR",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "0a474fef-8e96-4913-8f08-f26bb90e7dbd",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Instead of having y-prosemirror interleave diffing information directly in the Prosemirror document state, information about diffs would be emitted as ",
        },
        {
          type: "text",
          text: "metadata",
          styles: {
            bold: true,
          },
        },
        {
          type: "text",
          text: " separately. The editor (BlockNote) will then be responsible for rendering the diffs, likely using Prosemirror decorations.",
        },
      ],
    },
    {
      id: "2625a3f7-122b-46c8-bed7-703707630275",
      type: "paragraph",
    },
    {
      id: "95701bcc-72b4-4111-9b43-363603bd51da",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This is a major architectural shift from how y-prosemirror currently works. ",
          styles: {
            bold: true,
          },
        },
        {
          type: "text",
          text: "(min 2 weeks of work to make it work for suggestions, +- 1-3 days to make it work for static diffs)",
        },
      ],
    },
    {
      id: "7e452494-ec6a-42dd-b6c2-3c4d659572fc",
      type: "paragraph",
    },
    {
      id: "614dd3ae-6a51-4694-bcc7-7f616d19e0c1",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Pros:",
        },
      ],
    },
    {
      id: "4487ca50-1ccb-4883-b30b-07e8172c8a5d",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Only solution that decouples the ",
          styles: {
            bold: true,
          },
        },
        {
          type: "text",
          text: "rendering ",
          styles: {
            bold: true,
            italic: true,
          },
        },
        {
          type: "text",
          text: "of diffs completely from the document:",
          styles: {
            bold: true,
          },
        },
      ],
      children: [
        {
          id: "cd742d02-63f2-48a3-a8f1-dd87aab04d0d",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Consumers don't need to change schema; just works for everyone",
            },
          ],
        },
        {
          id: "c10f33ba-52ae-4597-a3a1-e739e45c7b10",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Lets the editor control completely ",
            },
            {
              type: "text",
              text: "how diffs are rendered",
              styles: {
                bold: true,
              },
            },
            {
              type: "text",
              text: " instead of being restricted to how the data layer (y-prosemirror) determines the diff. E.g.: you could even do side-by-side diffs, etc",
            },
          ],
        },
        {
          id: "20356161-4ba0-480c-b9ea-f9e014ac304e",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Editor doesn't need to change its schema",
            },
          ],
        },
        {
          id: "3106320b-70ba-4ae3-9883-bddce89572fc",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Editor (and prosemirror plugins) ",
            },
            {
              type: "text",
              text: "don't need to account for suggestions (duplicate nodes) appearing",
              styles: {
                bold: true,
              },
            },
            {
              type: "text",
              text: " in the document state, because they're not part of the document anymore. ",
            },
          ],
          children: [
            {
              id: "b736958c-cf7b-45e5-a51b-2e7f851819db",
              type: "bulletListItem",
              content: [
                {
                  type: "text",
                  text: "Probably least work to make plugins prosemirror-tables compatible compared to other solutions",
                },
              ],
            },
            {
              id: "7f83f148-166b-4c5a-90c9-79ee11fc22ae",
              type: "bulletListItem",
              content: [
                {
                  type: "text",
                  text: 'BlockNote example: all other solutions need to rework the API surface, because there can now be a "deleted block" and an "inserted block" with the same id in the document. Requires work to make should APIs like ',
                },
                {
                  type: "text",
                  text: "editor.getBlock(id)",
                  styles: {
                    code: true,
                  },
                },
                {
                  type: "text",
                  text: " and call sites handle this?",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "48c0afec-90b3-4cd1-a75e-b188eefc9612",
      type: "paragraph",
    },
    {
      id: "f627747c-b25d-4918-8fc1-b3fcb0ad9d98",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Cons:",
        },
      ],
    },
    {
      id: "66368e55-a4d1-4618-9f53-4dc0829bce5c",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Deleted content is not a first class citizen of the editor anymore, but sits outside of it. This has some consequences. Without significant extra effort, with this approach we:",
        },
      ],
      children: [
        {
          id: "fd7bc888-fbbf-49de-94c9-cdc52ea0f31c",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Can't edit deleted content",
              styles: {
                bold: true,
              },
            },
          ],
        },
        {
          id: "0bde15ed-8569-4149-a769-ec5bced4d956",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "No cursors in deleted content",
              styles: {
                bold: true,
              },
            },
          ],
        },
        {
          id: "f8646c47-b339-4746-a93b-855071dfa16f",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: 'Not possible to comment on deleted content (you can still comment on the "suggestion to delete", but not on comments on a part of the deleted area)',
              styles: {
                bold: true,
              },
            },
          ],
        },
        {
          id: "ddbff30f-13b6-4556-af75-b1e72bd6ed22",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Some tricks needed to render a cursor on both sides of deleted content",
            },
          ],
        },
      ],
    },
    {
      id: "678a0e9b-3db7-434a-a395-30a4d102ed1c",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "More work on the consumer (editor) to render content",
        },
      ],
    },
    {
      id: "d7d7f768-5619-496a-9845-7b8ef49b75f1",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "C: Use current architecture, but control where diffs are rendered",
        },
      ],
    },
    {
      id: "151c0cc8-2782-4b4f-a995-92c80692aadb",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Before choosing option A or B, we can explore alternatives that use the current architecture of both y-prosemirror and BlockNote.",
        },
      ],
    },
    {
      id: "a97ea356-1d8f-4881-aae7-3ae39a76d54d",
      type: "paragraph",
    },
    {
      id: "d747a50e-577f-4fef-8986-34087444f091",
      type: "heading",
      props: {
        level: 4,
      },
    },
    {
      id: "574bf899-c9b5-4815-a097-d6813878e9be",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/YousefED/y-prosemirror/pull/2",
          content: [
            {
              type: "text",
              text: "POC PR",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "71790421-d87a-4fda-8750-5918ecb30de9",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Pros:",
        },
      ],
    },
    {
      id: "c234ca5a-8d40-43a0-b609-0e1761a00695",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: 'No editor schema change needed: duplicate nodes will only appear at the "block boundary"',
        },
      ],
    },
    {
      id: "1c597102-4c8a-42fb-8161-547ce78b3327",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: 'Can improve "conflict resolution" of some other operations (e.g.: multiple users create a child block)',
        },
      ],
    },
    {
      id: "09c694da-9118-43a6-8ca6-efc99f72d18c",
      type: "paragraph",
    },
    {
      id: "c730ff68-41bd-4817-b5b7-d61cdb10b291",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Cons:",
        },
      ],
    },
    {
      id: "195f16d9-5d4f-48ac-89a2-9a02c457b28f",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Need to be very delicate about how to allow this functionality (how to expose it from y-prosemirror)",
        },
      ],
      children: [
        {
          id: "77124308-3a25-4204-a22c-bd8d64f96b31",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "For example: only allow transforming certain nodes in a safe manner: e.g. ",
            },
            {
              type: "text",
              text: "<paragraph />",
              styles: {
                code: true,
              },
            },
            {
              type: "text",
              text: " ↦ ",
            },
            {
              type: "text",
              text: '<_block type="paragraph"',
              styles: {
                code: true,
              },
            },
            {
              type: "text",
              text: " .",
            },
          ],
        },
      ],
    },
    {
      id: "927b24ee-8c08-4262-95a1-315a52cadf47",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Requires data migration",
        },
      ],
    },
    {
      id: "87f6f274-6f98-44a2-b96f-b8ca391a59ff",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "The Yjs storage format",
        },
      ],
    },
    {
      id: "5e72c1e9-1cfe-47cb-8db1-d155a5284e4e",
      type: "paragraph",
    },
    {
      id: "da6c5c36-828e-4f87-bdd1-4197b143294d",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "C2: custom diffing boundary",
        },
      ],
    },
    {
      id: "06d99d26-28a2-42e7-9e08-d87a20e8586a",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/yjs/y-prosemirror/pull/267",
          content: [
            {
              type: "text",
              text: "POC PR y-prosemirror",
              styles: {},
            },
          ],
        },
        {
          type: "text",
          text: " /  BlockNote ",
        },
        {
          type: "link",
          href: "https://github.com/TypeCellOS/BlockNote/pull/2849",
          content: [
            {
              type: "text",
              text: "PR",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "b46f672b-f6a8-44e1-a9f6-c4a3652ed3a6",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://blocknote-git-y-prosemirror-tests-matchnodes-typecell.vercel.app/collaboration/yhub",
          content: [
            {
              type: "text",
              text: "POC Demo",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "4161db5c-05d3-4451-a8b3-08977cd6f6a3",
      type: "paragraph",
    },
    {
      id: "5c3e6b25-8b6b-4d58-9fa5-7025c2d1e916",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This POC lets the diff decide ",
          styles: {
            textColor: "rgb(31, 35, 40)",
            backgroundColor: "rgb(255, 255, 255)",
          },
        },
        {
          type: "text",
          text: "modify-in-place vs. replace",
          styles: {
            italic: true,
          },
        },
        {
          type: "text",
          text: " via a caller-supplied predicate, so the boundary can be raised to a whole node. In this way, the diff produces two sibling ",
          styles: {
            textColor: "rgb(31, 35, 40)",
            backgroundColor: "rgb(255, 255, 255)",
          },
        },
        {
          type: "text",
          text: "blockContainer",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: "s (allowed in schema) instead of two block-contents in one ",
          styles: {
            textColor: "rgb(31, 35, 40)",
            backgroundColor: "rgb(255, 255, 255)",
          },
        },
        {
          type: "text",
          text: "blockContainer",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " (not allowed in schema)",
        },
        {
          type: "text",
          text: ".",
          styles: {
            textColor: "rgb(31, 35, 40)",
            backgroundColor: "rgb(255, 255, 255)",
          },
        },
      ],
    },
    {
      id: "c3a4efd8-971f-4cb6-be5e-43b889ccb768",
      type: "paragraph",
    },
    {
      id: "0d5d4caf-38bb-48e1-a5bc-803737023b61",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Pros:",
        },
      ],
    },
    {
      id: "3144fbf6-e488-4e90-a1e8-99a8bfd33ba8",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Relatively simple change",
        },
      ],
    },
    {
      id: "14e399c6-a3ee-4781-a2ac-f4117d69b730",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: 'No editor schema change needed: duplicate nodes will only appear at the "block boundary"',
        },
      ],
    },
    {
      id: "769a9e15-1209-4bf7-adc7-dc8faf4665ec",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "No data migration needed",
        },
      ],
    },
    {
      id: "8018af78-6997-4767-a29d-428d3d97af0c",
      type: "paragraph",
    },
    {
      id: "9bc9cb75-33a1-44ed-a074-fd0e6016ccae",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Cons:",
        },
      ],
    },
    {
      id: "63d5dbf8-56b9-422b-84c7-2b809ca39531",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Changing a block type (e.g. heading -> paragraph) will create a new blockcontainer node. This has some downsides:",
        },
      ],
      children: [
        {
          id: "44acffd1-f97f-4330-81d8-55a0ae77a9dc",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: 'attribution: all nested children will be "copied", and attributed to the user who made the change',
            },
          ],
        },
        {
          id: "5204487f-f071-47f5-a4f5-feff4293c92c",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "diffing: the entire block will be shown as modified, including child blocks, when the parent block type was changed",
            },
          ],
        },
        {
          id: "cf30c75b-6e9e-4318-aad3-38d2696dcebd",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "conflicts: simultaneous block-type changes and text / children edits won't merge nicely (will be LWW)",
            },
          ],
        },
      ],
    },
    {
      id: "0550d822-274c-4071-83e3-93d71d30de3c",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "TBD: We might not be able to visualize it when two users both add a nested block, or, similar to the above, this would be a new blockcontainer node with same downsides of attribution / diffing / conflicts (but for adding / removing the first child block instead of for changing the block type)",
        },
      ],
    },
    {
      id: "e9dd7478-b824-4c1f-a0d9-12fb5123804f",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "TBD: works with older docs?",
        },
      ],
    },
    {
      id: "95361861-86b7-41b1-8726-76f96e849613",
      type: "paragraph",
    },
    {
      id: "84c9c4ce-f116-4bc6-b5df-119e09711db8",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We're still investigating this solution",
        },
      ],
    },
    {
      id: "32d4f752-75fc-45b6-ad10-a4bc3bc47f65",
      type: "paragraph",
    },
    {
      id: "50f9a169-419e-4bd1-af3a-2af89350524e",
      type: "divider",
    },
    {
      id: "2e2cea10-5373-4ced-bfc0-d0eba8c4f59d",
      type: "heading",
      props: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Open tasks",
        },
      ],
    },
    {
      id: "62986f28-3a36-4702-83f8-194a6a805dc0",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The currently scoped remaining work has been categorized in 5 phases:",
        },
      ],
    },
    {
      id: "bd772ad8-b12d-42d2-8082-be58366cbc3b",
      type: "paragraph",
    },
    {
      id: "de0e3f48-8b39-44f4-8766-c8344dc97d79",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "1: Demo readiness",
        },
      ],
    },
    {
      id: "cf5b7f55-53fe-4847-9ff9-2adff6beeee6",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Demo+readiness%22",
          content: [
            {
              type: "text",
              text: "View Issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "4cd9804b-f320-4cfe-83a2-a25c46066104",
      type: "paragraph",
    },
    {
      id: "6ca5e395-6654-4b05-b616-ef3bcdf96239",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Get the current work to a demoable and testable state",
        },
      ],
    },
    {
      id: "c009551c-2f98-4ea8-8654-404e6b7444ac",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "66971ae0-91f7-4c42-9c23-2e679527ab45",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "schema compatibility",
            },
          ],
        },
        {
          id: "d328f8ed-1a83-489c-bca4-79bdf044fbac",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Add support for Table diffs to BlockNote and y-prosemirror",
            },
          ],
          children: [
            {
              id: "f2d81783-ccb4-4d65-b94c-11c168899607",
              type: "bulletListItem",
              content: [
                {
                  type: "text",
                  text: "This has some unknowns and potentially needs a number of changes to ",
                },
                {
                  type: "text",
                  text: "prosemirror-tables",
                  styles: {
                    code: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "c9ca8f7f-3a08-46cb-90bc-dc5696d7f260",
      type: "paragraph",
    },
    {
      id: "e41f3d25-e219-4b3c-9f4b-faf64ba214d4",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Estimate: depends on schema next step",
        },
      ],
    },
    {
      id: "0b33469a-e047-4e86-846f-ee820583ce82",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "2: Stability",
        },
      ],
    },
    {
      id: "58b960dd-d5f8-4af3-a8a7-37ffaebd3611",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Stability+%28diffs+%2F+versions%29%22",
          content: [
            {
              type: "text",
              text: "View Issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "040949d3-65c5-43e6-ae57-a8f27c5c9f73",
      type: "paragraph",
    },
    {
      id: "7937911d-a79c-4774-af90-67b342c7fa23",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Fix known issues in the current y-prosemirror binding",
        },
      ],
    },
    {
      id: "0d7025db-3eb1-4bfc-b693-e885b4d60390",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "y-prosemirror at level that is comfortable to release as new major version",
          styles: {
            bold: true,
          },
        },
      ],
    },
    {
      id: "0981d2e1-9ab3-48f8-b1a1-4365a548b2b8",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "TODO Biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "18b5622c-76e3-4e41-9659-820801967147",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Potential new items after testing demo",
            },
          ],
        },
      ],
    },
    {
      id: "e67ccfc3-10c1-4fb1-80a8-f0ffaf03ff91",
      type: "paragraph",
    },
    {
      id: "625026e4-198e-4ad7-ab64-f884e82aaf9a",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Initial estimate Kevin: 5-8 days + ??? for unknowns",
        },
      ],
    },
    {
      id: "19c4f7cb-0c2e-4fe7-b25c-af9f31fb0aba",
      type: "paragraph",
    },
    {
      id: "eea91bef-61f2-4ac8-9d2c-559fdc528a30",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "2 XS",
        },
      ],
    },
    {
      id: "5e3740c6-cee0-4e53-a6c0-8c55a7864ce5",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "2 S",
        },
      ],
    },
    {
      id: "1cc8ee7b-0e9d-43bd-9f10-68e5e2295b73",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "3 M",
        },
      ],
    },
    {
      id: "8b19fecc-ceed-4139-99dd-5bac14990fd4",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "1 L",
        },
      ],
    },
    {
      id: "2e1b9234-38a5-4e07-98b3-1c2196054d88",
      type: "paragraph",
    },
    {
      id: "5b16f492-2b25-400c-987b-97b8a5eb4c90",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Counted estimate: 2+(3-6)+(2-5) = 6-13 days + ??? for unknowns",
        },
      ],
    },
    {
      id: "f2eb1b59-3909-4a6c-af47-b31662cabeae",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "3: BlockNote level features",
        },
      ],
    },
    {
      id: "49904179-8e10-4770-9587-524966c4581c",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22BlockNote+level+features%22",
          content: [
            {
              type: "text",
              text: "View issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "a959c626-b4bc-4efa-af6e-b15aedb177b6",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Implement history panel",
        },
      ],
    },
    {
      id: "14138376-912f-428f-ab74-643652c6bb62",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: 'Update BlockNote APIs and documentation, make existing BlockNote APIs compatible with "diff views"',
        },
      ],
    },
    {
      id: "69af46e1-d7c2-436f-8bae-dae836d3ae96",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "6787c2bc-28d5-4cf6-9bb0-1d05aceefddb",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "none at this moment",
            },
          ],
        },
      ],
    },
    {
      id: "37fa84cf-570a-411a-9e96-c9e3bc9113d0",
      type: "paragraph",
    },
    {
      id: "a450596d-8901-4712-8f3c-d4425a53d72b",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "1 L",
        },
      ],
    },
    {
      id: "540c68ec-944b-45a0-9f79-4e1591b98af1",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "2 M",
        },
      ],
    },
    {
      id: "f89a92e8-6742-416f-af07-b65c099b7718",
      type: "paragraph",
    },
    {
      id: "859ed9e8-be8d-4582-ac11-f7195a5f1f7c",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "= 4-9 days",
        },
      ],
    },
    {
      id: "2cb75462-1df9-4f94-bf7b-4ebb3de96fbb",
      type: "paragraph",
    },
    {
      id: "81363d76-5daa-44f1-ac79-61b967f193db",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "4: Rollout",
        },
      ],
    },
    {
      id: "ae6ac180-2492-41c6-9abb-2ae4dc00d4df",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Release+%2F+rollout%22",
          content: [
            {
              type: "text",
              text: "View issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "c6c65714-7d1b-43fc-8d23-5f6a452b4f18",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Migration guide",
        },
      ],
    },
    {
      id: "361cbb94-ec74-482a-8c08-e2b938183064",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Stable release of y-prosemirror + yjs + lib0",
        },
      ],
      children: [
        {
          id: "d010e74c-d72f-4d11-9d96-fac784b9ec6a",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Planned for end of August",
            },
          ],
        },
      ],
    },
    {
      id: "2eed8480-da1e-4f64-90ba-3ccf6a9df08f",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Release of BlockNote with (optional) new Yjs / y-prosemirror compatibility",
        },
      ],
    },
    {
      id: "19b84b6a-5c1e-4637-917f-57282cff6612",
      type: "paragraph",
    },
    {
      id: "e350b6ae-c8ff-4968-9149-419b08328923",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "5f7423fe-81d4-4a5b-8c1e-b9797308ec2b",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "none at this moment",
            },
          ],
        },
      ],
    },
    {
      id: "b5eab023-1223-4fd9-817f-3dbca47c5e7d",
      type: "paragraph",
    },
    {
      id: "eade368f-5d90-49d6-b012-42e873d2dddf",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "3 M",
        },
      ],
    },
    {
      id: "569e9d88-2901-41df-acb0-f1b631012df3",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "1 S",
        },
      ],
    },
    {
      id: "1c415b65-68b1-4ab3-adf4-7e0c903a9232",
      type: "paragraph",
    },
    {
      id: "630aaf9f-de91-4643-a2af-8e47f1c67ef2",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "= 3.5 - 6.5 days",
        },
      ],
    },
    {
      id: "ab044a82-f38c-459a-99c7-342bb176e556",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "5: Suggestions",
        },
      ],
    },
    {
      id: "0e9ae6b9-85b1-4164-a137-e14323edb349",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Suggestions+%28track+changes%29%22",
          content: [
            {
              type: "text",
              text: "View issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "2b12f097-fe31-43dd-97db-6bea1e33dfa2",
      type: "paragraph",
    },
    {
      id: "e8cca260-bc7e-4a2c-834d-89a7d337e336",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Specific features related to suggestions / track changes.",
        },
      ],
    },
    {
      id: "116548de-8362-432b-af2c-af2702e16d5e",
      type: "paragraph",
    },
    {
      id: "6476312d-aa12-4e5b-a093-bd36b90fddca",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "357f34c3-599e-4068-a196-83cc6930f2f0",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "delete suggestions",
            },
          ],
        },
      ],
    },
    {
      id: "3fe5c25b-87a8-4b97-bb3f-675bce4a7848",
      type: "paragraph",
    },
    {
      id: "f2e94dbf-07ea-4f37-9a3c-438b0431618d",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "1 XL",
        },
      ],
    },
    {
      id: "d13e3a8e-8239-40fc-ba89-7a9c57af2c88",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "3 L",
        },
      ],
    },
    {
      id: "2822cf62-665d-4d82-bfe3-3e6d9b87419f",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "4 M",
        },
      ],
    },
    {
      id: "596a8524-457a-41e8-b715-042adc217db2",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "2 S",
        },
      ],
    },
    {
      id: "c24c882a-b16a-41ea-b7dd-20c057777353",
      type: "paragraph",
    },
    {
      id: "057da6a6-7b99-478e-8629-14efcad4028d",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "= (6-15)+(4-8)+1 = 11-24 days",
        },
      ],
    },
    {
      id: "c7e9c438-e13c-4a3d-811e-f057c53dc3cf",
      type: "paragraph",
    },
    {
      id: "7241a164-f239-4720-9e02-918dcaab4bc0",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "24-50 days including suggestions",
        },
      ],
    },
    {
      id: "d28b8635-26f0-4d76-a7fb-109ccf43c887",
      type: "paragraph",
    },
    {
      id: "0a2e2695-c83b-44cb-9143-180a165edc04",
      type: "heading",
      props: {
        level: 4,
      },
      content: [
        {
          type: "text",
          text: "paragraph",
        },
      ],
      children: [
        {
          id: "cb42c39b-0287-4e24-88f1-6af366bf26df",
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "nested",
            },
          ],
        },
        {
          id: "45af11e1-3e8f-45bf-a7a1-aad495ac012c",
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "nested 2",
            },
          ],
        },
        {
          id: "5fbe5416-5211-4557-9fe6-2423f586ea3a",
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "nested 3",
            },
          ],
        },
      ],
    },
    {
      id: "543ee1ab-e938-48f7-adf6-adf12fcf2b61",
      type: "paragraph",
    },
    {
      id: "29161299-98be-4da7-8193-54bfa421b348",
      type: "paragraph",
    },
    {
      id: "189cfad8-9dd5-4a8a-bbdc-2b9e7475276f",
      type: "paragraph",
    },
    {
      id: "bfc0b6ed-5d4b-4025-a633-141dfb350882",
      type: "paragraph",
    },
    {
      id: "fd82942c-bdd4-4f22-8e97-e9ab38ab4566",
      type: "paragraph",
    },
    {
      id: "0ab346e1-d0b5-46d5-bff5-0e4ff2fcdeb3",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "august",
        },
      ],
    },
    {
      id: "17b42588-eecf-4d3e-9979-56230a0a1191",
      type: "paragraph",
    },
    {
      id: "6fe30bb4-b5cd-4237-b366-46b821875798",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "end of september",
        },
      ],
    },
    {
      id: "32d44d41-fc24-4e57-8869-4d06bc6f5d98",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "end of december",
        },
      ],
    },
    {
      id: "74154187-c2a8-4d68-92e1-a08dd22ae2d7",
      type: "paragraph",
    },
    {
      id: "9d145c8b-8c95-481d-8e29-6659f7bcb80c",
      type: "paragraph",
    },
  ],
  v5: [
    {
      id: "initialBlockId",
      type: "paragraph",
    },
    {
      id: "62818104-164b-4473-9760-25ffbc55937c",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "(For looking back what has been completed, there are the status updates)",
        },
      ],
    },
    {
      id: "c6c883d5-8174-4cf6-8a29-f4d2f1c81845",
      type: "heading",
      props: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Timeline overview",
        },
      ],
    },
    {
      id: "3d32d32a-ab6a-4d3d-9de0-0d831553ce12",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Original planning aimed for a beta version of suggestions and versioning in BlockNote by June 1st.",
        },
      ],
    },
    {
      id: "a91a9df4-a5bf-4429-8c1d-e87af0f588b0",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Status",
          styles: {
            bold: true,
          },
        },
        {
          type: "text",
          text: ": missed target 🔴 ",
        },
      ],
    },
    {
      id: "b3558b5b-a480-4a01-a279-69d7df6978b2",
      type: "paragraph",
    },
    {
      id: "ec1d43d3-f397-4288-a957-7b20c06d08a6",
      type: "paragraph",
    },
    {
      id: "19df856a-c621-4d09-86df-b59aa62efc0c",
      type: "divider",
    },
    {
      id: "504bdf5b-5c9c-4435-bd08-d52333d68a7e",
      type: "heading",
      props: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Schema compatibility",
        },
      ],
    },
    {
      id: "1bf06b34-31d2-4946-8452-fe566f82ba58",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: 'The main roadblock we\'re facing at this moment is the current approach to showing "diffs" (critical for both versioning and suggestions) in y-prosemirror developed so-far is incompatible with certain features of Prosemirror: complex schemas. ',
        },
      ],
    },
    {
      id: "cf5fadc8-e2be-45fc-b03f-376533c12af7",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "BlockNote uses a relatively advanced schema to represent nested blocks (child blocks) and thus, we're running into issues setting up a BlockNote demo that goes beyond the basics.",
        },
      ],
    },
    {
      id: "5bd6bff7-42b7-4dce-a6b3-4a67e4449e68",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "Technical explanation",
        },
      ],
    },
    {
      id: "bc9d6844-fff9-4af8-a4cb-53f42763a12c",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "When a user changes a paragraph to a heading, y-prosemirror wants to change the Prosemirror state to the following:",
        },
      ],
    },
    {
      id: "8260bb80-3022-421c-b1fe-050ba69f7234",
      type: "paragraph",
    },
    {
      id: "bbff29b1-4261-4980-bf9a-0b2a29f43317",
      type: "codeBlock",
      props: {
        language: "javascript",
      },
      content: [
        {
          type: "text",
          text: "<blockcontainer>\n<heading old>Text</heading>\n<paragraph new>Text</paragraph>\n</blockcontainer>",
        },
      ],
    },
    {
      id: "ba0e68ad-93ca-4e15-8848-01d9fbbcf521",
      type: "paragraph",
    },
    {
      id: "79eed386-42a1-4040-86f6-c97b1c0f2310",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "However, this is not allowed in the BlockNote Prosemirror schema, because ",
        },
        {
          type: "text",
          text: "blockcontainer",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " can only contain ",
        },
        {
          type: "text",
          text: "blockContent blockgroup?",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " (paragraph and heading are blockContent, blockgroup is optional in case there are child blocks). I.e.: a ",
        },
        {
          type: "text",
          text: "BlockContainer",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " is allowed to only contain a single node like heading / paragraph.",
        },
      ],
    },
    {
      id: "b1111058-0cac-4256-b575-9c986d8b8745",
      type: "paragraph",
    },
    {
      id: "ac2d4c00-0f0e-4593-b603-8f21f969186a",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The past +-2 weeks we've explored several ways to work around these issues (see ",
        },
        {
          type: "link",
          href: "https://docs.blocknotejs.mosacloud.eu/docs/d4846e43-a647-42ba-ab14-b9f6031437c3/",
          content: [
            {
              type: "text",
              text: "doc",
              styles: {},
            },
          ],
        },
        {
          type: "text",
          text: "). Broadly, remedies come down to one of 3 solutions:",
        },
      ],
    },
    {
      id: "39e60437-a012-485c-9a00-7b544061de09",
      type: "paragraph",
    },
    {
      id: "84f7f5db-e274-4396-92fd-87aa2fc9d28d",
      type: "divider",
    },
    {
      id: "e1bf56d9-d64d-4bba-ada5-3d3a1a1334ac",
      type: "image",
      props: {
        name: "image.png",
        url: "https://docs.blocknotejs.mosacloud.eu/media/8819d7a2-fc6b-4f2d-99df-9848fdb5c105/attachments/d0bc8283-1ad7-468a-bfab-84dcb4704d63.png",
      },
    },
    {
      id: "3962b829-4de5-418b-a22b-b7937705c1db",
      type: "paragraph",
    },
    {
      id: "aa70b19a-d0b8-44c1-ac1f-a1049a057227",
      type: "divider",
    },
    {
      id: "5b3f3808-a3de-44ee-a5e1-2d610e21f423",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "A: Change architecture of BlockNote",
        },
      ],
    },
    {
      id: "82e90c8a-d18b-4847-a17a-46d7abc7b78a",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: 'Change BlockNote in such a way that we relax the schema so "diffing nodes" (',
        },
        {
          type: "text",
          text: "heading old",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " in the example) are allowed everywhere in the document. For example, we could:",
        },
      ],
    },
    {
      id: "d7009d83-7fd6-4611-92ea-50f8141051c8",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: 'Allow special "diffing nodes" within blockContainer',
        },
      ],
    },
    {
      id: "3fddd740-1615-4fd9-bf27-a044ce7dc394",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Flatten the BlockNote PM schema as much as possible. For example, instead of using a tree-based structure to represent children / nesting, keep blocks in a flat array and use an ",
        },
        {
          type: "text",
          text: "indentation",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " for nesting",
        },
      ],
    },
    {
      id: "a468194d-5c50-48c7-a6c4-c9ca3d9c2b66",
      type: "paragraph",
    },
    {
      id: "a5b2253a-5500-4739-87b2-0a00ac60d6c4",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Pro:",
        },
      ],
    },
    {
      id: "e46fae75-2767-4a37-a74e-4a4ba8ab3ac0",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "We could expand the refactor to have some additional benefits:",
        },
      ],
      children: [
        {
          id: "5a1636a4-ee19-4345-85d1-bade8c4130e5",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "better conflict-resolution for nesting / unnesting",
            },
          ],
        },
        {
          id: "e4270ab2-da4b-4900-b5af-6374b7c059a1",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Indent/dedent would show cleaner in diffs",
            },
          ],
        },
        {
          id: "f12ab91e-1bec-4ca3-8ec1-bbe16d54ca8a",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: 'the ability to do word / google docs style multi-tab indentation (instead of Notion-style "child" structure)',
            },
          ],
        },
      ],
    },
    {
      id: "184cb770-eccc-40aa-b29a-48a2d555b0ee",
      type: "paragraph",
    },
    {
      id: "d3c432c9-0869-45a0-8a58-a18dc7322744",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Con:",
        },
      ],
    },
    {
      id: "e5fb5ec6-a5a7-4b8e-b3ff-2e01804c80ce",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "While feasible, this would affect almost all parts of the code base that interact with Prosemirror nodes, and would likely be a multi-week refactor (rough estimate 4 weeks).",
        },
      ],
    },
    {
      id: "6e4f7350-8f94-48b3-9818-30685caebd84",
      type: "divider",
    },
    {
      id: "9b328ccb-a58c-4804-a13c-3cdd615235cd",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "B: Change architecture of y-prosemirror",
        },
      ],
    },
    {
      id: "8c35ab69-b952-4715-93de-e0b48cba1690",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://blocknote-git-y-prosemirror-decorations-typecell.vercel.app/collaboration/yhub",
          content: [
            {
              type: "text",
              text: "POC Demo",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "32da9f69-df08-40f7-bc0f-6304cef85a98",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/yjs/y-prosemirror/pull/264",
          content: [
            {
              type: "text",
              text: "POC PR",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "0a474fef-8e96-4913-8f08-f26bb90e7dbd",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Instead of having y-prosemirror interleave diffing information directly in the Prosemirror document state, information about diffs would be emitted as ",
        },
        {
          type: "text",
          text: "metadata",
          styles: {
            bold: true,
          },
        },
        {
          type: "text",
          text: " separately. The editor (BlockNote) will then be responsible for rendering the diffs, likely using Prosemirror decorations.",
        },
      ],
    },
    {
      id: "2625a3f7-122b-46c8-bed7-703707630275",
      type: "paragraph",
    },
    {
      id: "95701bcc-72b4-4111-9b43-363603bd51da",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This is a major architectural shift from how y-prosemirror currently works. ",
          styles: {
            bold: true,
          },
        },
        {
          type: "text",
          text: "(min 2 weeks of work to make it work for suggestions, +- 1-3 days to make it work for static diffs)",
        },
      ],
    },
    {
      id: "7e452494-ec6a-42dd-b6c2-3c4d659572fc",
      type: "paragraph",
    },
    {
      id: "614dd3ae-6a51-4694-bcc7-7f616d19e0c1",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Pros:",
        },
      ],
    },
    {
      id: "4487ca50-1ccb-4883-b30b-07e8172c8a5d",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Clean separation of concerns: only solution that decouples the ",
          styles: {
            bold: true,
          },
        },
        {
          type: "text",
          text: "rendering ",
          styles: {
            bold: true,
            italic: true,
          },
        },
        {
          type: "text",
          text: "of diffs completely from the document:",
          styles: {
            bold: true,
          },
        },
      ],
      children: [
        {
          id: "cd742d02-63f2-48a3-a8f1-dd87aab04d0d",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Consumers don't need to change schema; just works for everyone",
            },
          ],
        },
        {
          id: "c10f33ba-52ae-4597-a3a1-e739e45c7b10",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Lets the editor control completely ",
            },
            {
              type: "text",
              text: "how diffs are rendered",
              styles: {
                bold: true,
              },
            },
            {
              type: "text",
              text: " instead of being restricted to how the data layer (y-prosemirror) determines the diff. E.g.: you could even do side-by-side diffs, etc",
            },
          ],
        },
        {
          id: "20356161-4ba0-480c-b9ea-f9e014ac304e",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Editor doesn't need to change its schema",
            },
          ],
        },
        {
          id: "3106320b-70ba-4ae3-9883-bddce89572fc",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Editor (and prosemirror plugins) ",
            },
            {
              type: "text",
              text: "don't need to account for suggestions (duplicate nodes) appearing",
              styles: {
                bold: true,
              },
            },
            {
              type: "text",
              text: " in the document state, because they're not part of the document anymore. ",
            },
          ],
          children: [
            {
              id: "b736958c-cf7b-45e5-a51b-2e7f851819db",
              type: "bulletListItem",
              content: [
                {
                  type: "text",
                  text: "Probably least work to make plugins prosemirror-tables compatible compared to other solutions",
                },
              ],
            },
            {
              id: "7f83f148-166b-4c5a-90c9-79ee11fc22ae",
              type: "bulletListItem",
              content: [
                {
                  type: "text",
                  text: 'BlockNote example: all other solutions need to rework the API surface, because there can now be a "deleted block" and an "inserted block" with the same id in the document. Requires work to make should APIs like ',
                },
                {
                  type: "text",
                  text: "editor.getBlock(id)",
                  styles: {
                    code: true,
                  },
                },
                {
                  type: "text",
                  text: " and call sites handle this?",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "48c0afec-90b3-4cd1-a75e-b188eefc9612",
      type: "paragraph",
    },
    {
      id: "f627747c-b25d-4918-8fc1-b3fcb0ad9d98",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Cons:",
        },
      ],
    },
    {
      id: "66368e55-a4d1-4618-9f53-4dc0829bce5c",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Deleted content is not a first class citizen of the editor anymore, but sits outside of it. This has some consequences. Without significant extra effort, with this approach we:",
        },
      ],
      children: [
        {
          id: "fd7bc888-fbbf-49de-94c9-cdc52ea0f31c",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Can't edit deleted content",
              styles: {
                bold: true,
              },
            },
          ],
        },
        {
          id: "0bde15ed-8569-4149-a769-ec5bced4d956",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "No cursors in deleted content",
              styles: {
                bold: true,
              },
            },
          ],
        },
        {
          id: "f8646c47-b339-4746-a93b-855071dfa16f",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: 'Not possible to comment on deleted content (you can still comment on the "suggestion to delete", but not on comments on a part of the deleted area)',
              styles: {
                bold: true,
              },
            },
          ],
        },
        {
          id: "ddbff30f-13b6-4556-af75-b1e72bd6ed22",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Some tricks needed to render a cursor on both sides of deleted content",
            },
          ],
        },
      ],
    },
    {
      id: "678a0e9b-3db7-434a-a395-30a4d102ed1c",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "More work on the consumer (editor) to render content",
        },
      ],
    },
    {
      id: "bfd3b83c-c6b7-40a9-8d06-168bac12ab10",
      type: "paragraph",
    },
    {
      id: "e4731f10-766f-4925-8f32-8f23b0f7f7dd",
      type: "divider",
    },
    {
      id: "d7d7f768-5619-496a-9845-7b8ef49b75f1",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "C: Use current architecture, but control where diffs are rendered",
        },
      ],
    },
    {
      id: "151c0cc8-2782-4b4f-a995-92c80692aadb",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Before choosing option A or B, we can explore alternatives that use the current architecture of both y-prosemirror and BlockNote.",
        },
      ],
    },
    {
      id: "d747a50e-577f-4fef-8986-34087444f091",
      type: "heading",
      props: {
        level: 3,
        isToggleable: true,
      },
      content: [
        {
          type: "text",
          text: "C1: yjs <-> ProseMirror custom transforms  (can skip this one)",
        },
      ],
      children: [
        {
          id: "ec7c1f2f-0de3-430f-826b-35d9a322c254",
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://github.com/YousefED/y-prosemirror/pull/2",
              content: [
                {
                  type: "text",
                  text: "POC PR",
                  styles: {},
                },
              ],
            },
          ],
        },
        {
          id: "517b36b4-0c9b-47dd-8ca7-74f18ed20f50",
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Pros:",
            },
          ],
        },
        {
          id: "95ffbe3a-dcc0-4e9e-92f9-0b754b041363",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: 'No editor schema change needed: duplicate nodes will only appear at the "block boundary"',
            },
          ],
        },
        {
          id: "47396f50-cec2-40a3-b620-722bf33a8888",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: 'Can improve "conflict resolution" of some other operations (e.g.: multiple users create a child block)',
            },
          ],
        },
        {
          id: "bebced40-0054-4078-bc9d-b9ec4582dea5",
          type: "paragraph",
        },
        {
          id: "b4fac941-5b23-441f-8c42-eeb166032340",
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Cons:",
            },
          ],
        },
        {
          id: "90a28933-b35d-4151-a36d-e64568d67f91",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Need to be very delicate about how to allow this functionality (how to expose it from y-prosemirror)",
            },
          ],
          children: [
            {
              id: "642572dc-b85c-46c1-948c-f06b7df2a2f3",
              type: "bulletListItem",
              content: [
                {
                  type: "text",
                  text: "For example: only allow transforming certain nodes in a safe manner: e.g. ",
                },
                {
                  type: "text",
                  text: "<paragraph />",
                  styles: {
                    code: true,
                  },
                },
                {
                  type: "text",
                  text: " ↦ ",
                },
                {
                  type: "text",
                  text: '<_block type="paragraph"',
                  styles: {
                    code: true,
                  },
                },
                {
                  type: "text",
                  text: " .",
                },
              ],
            },
          ],
        },
        {
          id: "e84951b8-bab2-4416-b614-ff98e543926c",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Requires data migration",
              styles: {
                bold: true,
              },
            },
          ],
        },
        {
          id: "46aa6f60-3631-4455-afda-d74c2c3886a2",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "The Yjs storage format",
            },
          ],
        },
      ],
    },
    {
      id: "da6c5c36-828e-4f87-bdd1-4197b143294d",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "C2: custom diffing boundary",
        },
      ],
    },
    {
      id: "06d99d26-28a2-42e7-9e08-d87a20e8586a",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/yjs/y-prosemirror/pull/267",
          content: [
            {
              type: "text",
              text: "POC PR y-prosemirror",
              styles: {},
            },
          ],
        },
        {
          type: "text",
          text: " /  BlockNote ",
        },
        {
          type: "link",
          href: "https://github.com/TypeCellOS/BlockNote/pull/2849",
          content: [
            {
              type: "text",
              text: "PR",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "b46f672b-f6a8-44e1-a9f6-c4a3652ed3a6",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://blocknote-git-y-prosemirror-tests-matchnodes-typecell.vercel.app/collaboration/yhub",
          content: [
            {
              type: "text",
              text: "POC Demo",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "4161db5c-05d3-4451-a8b3-08977cd6f6a3",
      type: "paragraph",
    },
    {
      id: "5c3e6b25-8b6b-4d58-9fa5-7025c2d1e916",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This POC lets the diff decide ",
          styles: {
            textColor: "rgb(31, 35, 40)",
            backgroundColor: "rgb(255, 255, 255)",
          },
        },
        {
          type: "text",
          text: "modify-in-place vs. replace",
          styles: {
            italic: true,
          },
        },
        {
          type: "text",
          text: " via a caller-supplied predicate, so the boundary can be raised to a whole node. In this way, the diff produces two sibling ",
          styles: {
            textColor: "rgb(31, 35, 40)",
            backgroundColor: "rgb(255, 255, 255)",
          },
        },
        {
          type: "text",
          text: "blockContainer",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: "s (allowed in schema) instead of two block-contents in one ",
          styles: {
            textColor: "rgb(31, 35, 40)",
            backgroundColor: "rgb(255, 255, 255)",
          },
        },
        {
          type: "text",
          text: "blockContainer",
          styles: {
            code: true,
          },
        },
        {
          type: "text",
          text: " (not allowed in schema)",
        },
        {
          type: "text",
          text: ".",
          styles: {
            textColor: "rgb(31, 35, 40)",
            backgroundColor: "rgb(255, 255, 255)",
          },
        },
      ],
    },
    {
      id: "c3a4efd8-971f-4cb6-be5e-43b889ccb768",
      type: "paragraph",
    },
    {
      id: "0d5d4caf-38bb-48e1-a5bc-803737023b61",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Pros:",
        },
      ],
    },
    {
      id: "3144fbf6-e488-4e90-a1e8-99a8bfd33ba8",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Relatively simple change",
        },
      ],
    },
    {
      id: "14e399c6-a3ee-4781-a2ac-f4117d69b730",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: 'No editor schema change needed: duplicate nodes will only appear at the "block boundary"',
        },
      ],
    },
    {
      id: "769a9e15-1209-4bf7-adc7-dc8faf4665ec",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "No data migration needed",
        },
      ],
    },
    {
      id: "8018af78-6997-4767-a29d-428d3d97af0c",
      type: "paragraph",
    },
    {
      id: "9bc9cb75-33a1-44ed-a074-fd0e6016ccae",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Cons:",
        },
      ],
    },
    {
      id: "63d5dbf8-56b9-422b-84c7-2b809ca39531",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Changing a block type (e.g. heading -> paragraph) will create a new blockcontainer node. This has some downsides:",
        },
      ],
      children: [
        {
          id: "44acffd1-f97f-4330-81d8-55a0ae77a9dc",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: 'attribution: all nested children will be "copied", and attributed to the user who made the change',
            },
          ],
        },
        {
          id: "5204487f-f071-47f5-a4f5-feff4293c92c",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "diffing: the entire block will be shown as modified, including child blocks, when the parent block type was changed",
            },
          ],
        },
        {
          id: "cf30c75b-6e9e-4318-aad3-38d2696dcebd",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "conflicts: simultaneous block-type changes and text / children edits won't merge nicely (will be LWW)",
            },
          ],
        },
      ],
    },
    {
      id: "0550d822-274c-4071-83e3-93d71d30de3c",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "TBD: We might not be able to visualize it when two users both add a nested block, or, similar to the bullet point above, this would be a new blockcontainer node with same downsides of attribution / diffing / conflicts (but for adding / removing the first child block instead of for changing the block type)",
        },
      ],
    },
    {
      id: "e9dd7478-b824-4c1f-a0d9-12fb5123804f",
      type: "paragraph",
    },
    {
      id: "65aa733c-d9d9-44a4-937f-0041f4b48fc5",
      type: "paragraph",
    },
    {
      id: "32d4f752-75fc-45b6-ad10-a4bc3bc47f65",
      type: "paragraph",
    },
    {
      id: "50f9a169-419e-4bd1-af3a-2af89350524e",
      type: "divider",
    },
    {
      id: "2e2cea10-5373-4ced-bfc0-d0eba8c4f59d",
      type: "heading",
      props: {
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Open tasks",
        },
      ],
    },
    {
      id: "62986f28-3a36-4702-83f8-194a6a805dc0",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The currently scoped remaining work has been categorized in 5 phases:",
        },
      ],
    },
    {
      id: "bd772ad8-b12d-42d2-8082-be58366cbc3b",
      type: "paragraph",
    },
    {
      id: "de0e3f48-8b39-44f4-8766-c8344dc97d79",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "1: Demo readiness",
        },
      ],
    },
    {
      id: "cf5b7f55-53fe-4847-9ff9-2adff6beeee6",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Demo+readiness%22",
          content: [
            {
              type: "text",
              text: "View Issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "4cd9804b-f320-4cfe-83a2-a25c46066104",
      type: "paragraph",
    },
    {
      id: "6ca5e395-6654-4b05-b616-ef3bcdf96239",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Get the current work to a demoable and testable state",
        },
      ],
    },
    {
      id: "c009551c-2f98-4ea8-8654-404e6b7444ac",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "66971ae0-91f7-4c42-9c23-2e679527ab45",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "schema compatibility",
            },
          ],
        },
        {
          id: "d328f8ed-1a83-489c-bca4-79bdf044fbac",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Add support for Table diffs to BlockNote and y-prosemirror",
            },
          ],
          children: [
            {
              id: "f2d81783-ccb4-4d65-b94c-11c168899607",
              type: "bulletListItem",
              content: [
                {
                  type: "text",
                  text: "This has some unknowns and potentially needs a number of changes to ",
                },
                {
                  type: "text",
                  text: "prosemirror-tables",
                  styles: {
                    code: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "c9ca8f7f-3a08-46cb-90bc-dc5696d7f260",
      type: "paragraph",
    },
    {
      id: "e41f3d25-e219-4b3c-9f4b-faf64ba214d4",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Estimate: depends on schema next step",
        },
      ],
    },
    {
      id: "0b33469a-e047-4e86-846f-ee820583ce82",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "2: Stability",
        },
      ],
    },
    {
      id: "58b960dd-d5f8-4af3-a8a7-37ffaebd3611",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Stability+%28diffs+%2F+versions%29%22",
          content: [
            {
              type: "text",
              text: "View Issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "040949d3-65c5-43e6-ae57-a8f27c5c9f73",
      type: "paragraph",
    },
    {
      id: "7937911d-a79c-4774-af90-67b342c7fa23",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Fix known issues in the current y-prosemirror binding",
        },
      ],
    },
    {
      id: "0d7025db-3eb1-4bfc-b693-e885b4d60390",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "y-prosemirror at level that is comfortable to release as new major version",
          styles: {
            bold: true,
          },
        },
      ],
    },
    {
      id: "0981d2e1-9ab3-48f8-b1a1-4365a548b2b8",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "TODO Biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "18b5622c-76e3-4e41-9659-820801967147",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Potential new items after testing demo",
            },
          ],
        },
      ],
    },
    {
      id: "e67ccfc3-10c1-4fb1-80a8-f0ffaf03ff91",
      type: "paragraph",
    },
    {
      id: "625026e4-198e-4ad7-ab64-f884e82aaf9a",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Original initial estimate Kevin: 5-8 days ",
        },
      ],
    },
    {
      id: "eea91bef-61f2-4ac8-9d2c-559fdc528a30",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "2 XS / 2 S / 3 M / 1 L",
        },
      ],
    },
    {
      id: "5b16f492-2b25-400c-987b-97b8a5eb4c90",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Counted estimate: 2+(3-6)+(2-5) = 6-13 days, excluding unknowns for test phase improvements",
        },
      ],
    },
    {
      id: "f2eb1b59-3909-4a6c-af47-b31662cabeae",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "3: BlockNote level features",
        },
      ],
    },
    {
      id: "49904179-8e10-4770-9587-524966c4581c",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22BlockNote+level+features%22",
          content: [
            {
              type: "text",
              text: "View issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "a959c626-b4bc-4efa-af6e-b15aedb177b6",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Implement history panel",
        },
      ],
    },
    {
      id: "14138376-912f-428f-ab74-643652c6bb62",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: 'Update BlockNote APIs and documentation, make existing BlockNote APIs compatible with "diff views"',
        },
      ],
    },
    {
      id: "69af46e1-d7c2-436f-8bae-dae836d3ae96",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "6787c2bc-28d5-4cf6-9bb0-1d05aceefddb",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "none at this moment",
            },
          ],
        },
      ],
    },
    {
      id: "37fa84cf-570a-411a-9e96-c9e3bc9113d0",
      type: "paragraph",
    },
    {
      id: "a450596d-8901-4712-8f3c-d4425a53d72b",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "1 L / 2 M",
        },
      ],
    },
    {
      id: "859ed9e8-be8d-4582-ac11-f7195a5f1f7c",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "= 4-9 days",
        },
      ],
    },
    {
      id: "2cb75462-1df9-4f94-bf7b-4ebb3de96fbb",
      type: "paragraph",
    },
    {
      id: "81363d76-5daa-44f1-ac79-61b967f193db",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "4: Rollout",
        },
      ],
    },
    {
      id: "ae6ac180-2492-41c6-9abb-2ae4dc00d4df",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Release+%2F+rollout%22",
          content: [
            {
              type: "text",
              text: "View issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "c6c65714-7d1b-43fc-8d23-5f6a452b4f18",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Migration guide",
        },
      ],
    },
    {
      id: "361cbb94-ec74-482a-8c08-e2b938183064",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Stable release of y-prosemirror + yjs + lib0",
        },
      ],
      children: [
        {
          id: "d010e74c-d72f-4d11-9d96-fac784b9ec6a",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "Planned for end of August",
            },
          ],
        },
      ],
    },
    {
      id: "2eed8480-da1e-4f64-90ba-3ccf6a9df08f",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "Release of BlockNote with (optional) new Yjs / y-prosemirror compatibility",
        },
      ],
    },
    {
      id: "19b84b6a-5c1e-4637-917f-57282cff6612",
      type: "paragraph",
    },
    {
      id: "e350b6ae-c8ff-4968-9149-419b08328923",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "5f7423fe-81d4-4a5b-8c1e-b9797308ec2b",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "none at this moment",
            },
          ],
        },
      ],
    },
    {
      id: "b5eab023-1223-4fd9-817f-3dbca47c5e7d",
      type: "paragraph",
    },
    {
      id: "eade368f-5d90-49d6-b012-42e873d2dddf",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "3 M / 1 S",
        },
      ],
    },
    {
      id: "630aaf9f-de91-4643-a2af-8e47f1c67ef2",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "= 3.5 - 6.5 days",
        },
      ],
    },
    {
      id: "ab044a82-f38c-459a-99c7-342bb176e556",
      type: "heading",
      props: {
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "5: Suggestions",
        },
      ],
    },
    {
      id: "0e9ae6b9-85b1-4164-a137-e14323edb349",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://github.com/orgs/TypeCellOS/projects/14/views/1?filterQuery=category%3A%22Suggestions+%28track+changes%29%22",
          content: [
            {
              type: "text",
              text: "View issues",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      id: "2b12f097-fe31-43dd-97db-6bea1e33dfa2",
      type: "paragraph",
    },
    {
      id: "e8cca260-bc7e-4a2c-834d-89a7d337e336",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Specific features related to suggestions / track changes.",
        },
      ],
    },
    {
      id: "116548de-8362-432b-af2c-af2702e16d5e",
      type: "paragraph",
    },
    {
      id: "6476312d-aa12-4e5b-a093-bd36b90fddca",
      type: "bulletListItem",
      content: [
        {
          type: "text",
          text: "biggest blocker / unknown: ",
        },
      ],
      children: [
        {
          id: "357f34c3-599e-4068-a196-83cc6930f2f0",
          type: "bulletListItem",
          content: [
            {
              type: "text",
              text: "delete suggestions",
            },
          ],
        },
      ],
    },
    {
      id: "3fe5c25b-87a8-4b97-bb3f-675bce4a7848",
      type: "paragraph",
    },
    {
      id: "f2e94dbf-07ea-4f37-9a3c-438b0431618d",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "1 XL / 3 L / 4 M / 2 S",
        },
      ],
    },
    {
      id: "057da6a6-7b99-478e-8629-14efcad4028d",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "= (6-15)+(4-8)+1 = 11-24 days",
        },
      ],
    },
    {
      id: "c7e9c438-e13c-4a3d-811e-f057c53dc3cf",
      type: "paragraph",
    },
    {
      id: "7241a164-f239-4720-9e02-918dcaab4bc0",
      type: "paragraph",
    },
    {
      id: "344d2196-2024-4ba3-876e-432c653704fe",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Total:",
          styles: {
            bold: true,
          },
        },
      ],
    },
    {
      id: "5327a9d5-5f29-425b-aead-f1341654740c",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "24-50 days including suggestions",
        },
      ],
    },
    {
      id: "d28b8635-26f0-4d76-a7fb-109ccf43c887",
      type: "paragraph",
    },
    {
      id: "9d145c8b-8c95-481d-8e29-6659f7bcb80c",
      type: "paragraph",
    },
  ],
};
