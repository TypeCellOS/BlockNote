import React from "react";
import * as z from "zod";
/**
 * Should an ext be able to register another ext?
 *
 */
type Extension<T extends string> = {
  // constructor: (editor: BlockEditor<Extension<T>[]>) => any;
  // addMethods: (editor: BlockEditor<Extension<T>[]>) => any;
  /**
   * TODO in some cases you want your init methods to be called in a specific order, there are two solutions to this:
   * 1. A priority property
   * 2. A dependsOn tree
   */
  init?: () => void;
  type: T;
  destroy?: () => void;
  // What other things should be top-level here?
  // Does an ext need to add things to the schema? Or does a block add an ext? What is a bundle? Do we need it?
};

// function hasExtension<E extends Extension<string>[]>(
//   editor: BlockEditor<E>,
//   type: string,
// ): editor is BlockEditor<E> & {
//   extensions: { [K in E[number]["type"]]: Extract<E[number], Extension<K>> };
// } {
//   return type in editor.extensions;
// }

type BlockConfig<T extends string, P extends z.ZodObject> = {
  type: T;
  content: "inline" | "none";
  propSchema: P;
  contentType: "block";
};

type ConfigToProps<
  T extends
    | BlockConfig<string, z.ZodObject>
    | InlineConfig<string, z.ZodObject>
    | StyleConfig<string, z.ZodObject>,
> = T["propSchema"] extends z.ZodObject ? z.infer<T["propSchema"]> : never;

type InlineConfig<T extends string, P extends z.ZodObject> = {
  type: T;
  content: "styled" | "none";
  propSchema: P;
  contentType: "inline";
};

type StyleConfig<T extends string, P extends z.ZodObject> = {
  type: T;
  propSchema: P;
  contentType: "style";
};

type Schema = Record<
  string,
  | BlockConfig<string, z.ZodObject>
  | InlineConfig<string, z.ZodObject>
  | StyleConfig<string, z.ZodObject>
>;

type BlockEditor<
  S extends Schema = Schema,
  E extends Array<(editor: BlockEditor<S, E>) => Extension<string>> = [],
> = {
  exampleBuiltInMethod: () => any;

  extensions: {
    [K in ReturnType<E[number]>["type"]]: Extract<
      ReturnType<E[number]>,
      Extension<K>
    >;
  };

  registerRenderer: <T extends keyof S>(
    type: T,
    renderer: (component: { content: ConfigToProps<S[T]> }) => React.ReactNode,
  ) => void;

  registerSerializer: <T extends keyof S>(
    type: T,
    serializer: (content: S[T]) => string,
  ) => void;

  addExtension: (extension: any) => void; // need to create a derived extension with a different type

  // addExtension(name: string, extension: E);

  // addExtension(extension: E, name?: string);
};

type EditorWithinExtension<
  S extends Schema = Schema,
  E extends Array<(editor: BlockEditor<S, E>) => Extension<string>> = [],
> = Omit<BlockEditor<S, E>, "extensions"> & {
  extensions: {
    [K in ReturnType<E[number]>["type"]]?: Extract<
      ReturnType<E[number]>,
      Extension<K>
    >;
  };
};

function createExtension<
  S extends Schema,
  Ext extends Array<(editor: BlockEditor<S, Ext>) => Extension<string>> = [],
  T extends ReturnType<Ext[number]>["type"] = string,
  O extends Record<string, any> = Record<string, any>,
>(
  otherStuff: (editor: EditorWithinExtension<S, Ext>) => O,
): (editor: BlockEditor<S, Ext>) => Extension<T> & O {
  return (editor) =>
    ({
      ...otherStuff(editor),
    }) as any;
}

function createBlockEditor<
  E extends Array<(editor: BlockEditor<S, E>) => Extension<string>>,
  S extends Schema,
>(extensions: E): BlockEditor<S, E> {
  const editor = {} as BlockEditor<S, E>;
  const extensionsMap = {} as Record<string, Extension<string>>;

  extensions.forEach((ext) => {
    const extension = ext(editor);
    extensionsMap[extension.type] = extension;
  });

  // separately init after all extensions are added
  Object.values(extensionsMap).forEach((extension) => {
    if (extension.init) {
      extension.init();
    }
  });

  return {
    exampleBuiltInMethod: () => {
      return "exampleBuiltInMethod";
    },
    extensions: extensionsMap as any,
    addExtension: (extension: E) => {
      // extensions[extension.type] = extension;
    },
  } as const;
}

const SlashMenuExtension = createExtension("slashMenu", () => ({
  registerItem: (item: { name: string; icon: string }) => {
    return 3;
  },
}));
const XyzExtension = createExtension("xyz", () => ({}));

// const editor = createBlockEditor([SlashMenuExtension, XyzExtension]);

// editor.extensions.slashMenu.registerItem({
//   name: "xyz",
//   icon: "xyz",
// });

const YoutubeExtension = createExtension(
  // TODO just return the type in the second param??
  "youtube",
  (editor: EditorWithinExtension<any, [typeof SlashMenuExtension]>) => {
    // TODO do we like this onInit?
    // onInit(() => {
    //   if (editor.extensions.slashMenu) {
    //     editor.extensions.slashMenu.registerItem({
    //       name: "youtube",
    //       icon: "youtube",
    //     });
    //   }
    // });
    return {
      init() {
        if (editor.extensions.slashMenu) {
          editor.extensions.slashMenu.registerItem({
            name: "youtube",
            icon: "youtube",
          });
        }
      },
      insertYoutubeBlock: () => {
        // do something
      },
    };
  },
);

function createBlock<
  T extends () => Omit<BlockConfig<string, z.ZodObject>, "contentType">,
>(
  config: T,
): () => BlockConfig<ReturnType<T>["type"], ReturnType<T>["propSchema"]> {
  return () =>
    ({
      ...config,
      contentType: "block",
    }) as any;
}

// First principles:
// A schema is not dependent on anything else.

const youtubeBlock = createBlock(
  () =>
    ({
      type: "youtube",
      propSchema: z.object({
        url: z.string(),
      }),
      content: "none",
    }) as const,
);

type YoutubeBlockSchema = ReturnType<typeof youtubeBlock>;

const youtubeBlock2 = {
  contentType: "block",
  type: "youtube",
  propSchema: z.object({
    url: z.string(),
  }),
  content: "none",
} as const;

const youtubeBlock3 = {
  contentType: "block",
  type: "youtube",
  propSchema:
    1 < 2
      ? z.object({
          url: z.string(),
        })
      : z.object({
          xl: z.string(),
        }),
  content: "none",
} as const;

function YoutubeBlock({
  content,
  // mode,
}: {
  content: { url?: string; xl?: string };
  // if you care, render the html mode
  // mode: "html" | "view";
}) {
  return <iframe src={content.url} dynamic title="youtube" />;
}

// function YoutubeBlockHTML({ block }: { block: { url: string } }) {
//   return <iframe src={block.url} />;
// }
type TEST = InlineConfig<"test", z.ZodObject<{ test: z.ZodString }>>;
function TESTBlock({ content }: { content: { test: string } }) {
  return <div>{content.test}</div>;
}
// - change / disable certain functionality (keyboard shortcuts, etc)
// - implement optional (extension based) functionality (pdf rendering)
// - maybe not run everything on the server?
export const youtubeExtension = createExtension<{
  youtube: YoutubeBlockSchema;
  test: TEST;
}>((editor) => {
  return {
    type: "youtube",
    init() {
      editor.registerRenderer("youtube", YoutubeBlock);
      editor.registerRenderer("test", TESTBlock);
    },

    myFunction() {},
    myOtherFunction() {
      this.myFunction();
    },
  };
});

const ext = createExtension<{
  youtube: YoutubeBlockSchema;
  test: TEST;
}>()
  .name("youtube")
  .addMethods((editor) => {
    const store = createStore<number>(0);
    return {
      store,
      myFunction() {},
      myOtherFunction() {
        this.myFunction();
      },
    };
  })
  .onDestroy((editor, methods) => {
    methods.store.destroy();
  });

ext.onInit((editor) => {});

Extension.create({
  name: "youtube",
  create() {
    this.editor;
  },
  xyz: () => {
    this.editor;
    // Doesn't exist
  },
  addMethods() {
    const editor = this.editor;
    return {
      xyz: () => {
        return 3;
      },
    };
  },
});

export function extensionImplementation(
  editor: BlockEditor<{
    youtube: YoutubeBlockSchema;
    test: TEST;
  }>,
) {
  return {
    type: "youtube",
    init() {
      editor.registerRenderer("youtube", YoutubeBlock);
      editor.registerRenderer("test", TESTBlock);
    },
  } satisfies Extension<"youtube">;
  // editor.registerRenderer("youtube", YoutubeBlock);
  // editor.registerRenderer("test", TESTBlock);
}

// class YoutubeExtension extends BlockNoteExtension<{
//   youtube: YoutubeBlockSchema;
//   test: TEST;
// }>(
//   constructor(private readonly editor: BlockEditor<{

//   }) {

//   }

//     public type: "youtube",
//     public init() {
//       editor.registerRenderer("youtube", YoutubeBlock);
//       editor.registerRenderer("test", TESTBlock);
//     },
// });

const youtubeExtension = createExtension<{
  youtube: YoutubeBlockSchema;
  test: TEST;
}>({
  type: "youtube",
  features: [registerYoutubeRenderer, registerTestRenderer],
});

function registerYoutubeRenderer(
  editor: BlockEditor<{
    youtube: YoutubeBlockSchema;
    test: TEST;
  }>,
) {
  const store = createStore<number>(0);

  editor.registerRenderer("youtube", YoutubeBlock);

  return {
    addSlashMenuItem: () => {
      store.add(3);
      return 3;
    },
  };
}

class YoutubeExtension extends BlockNoteExtension {
  protected registerKeyboardShortcuts() {
    this.editor.registerKeyboardShortcut("y", () => {});
  }

  protected registerRenderers() {
    this.editor.registerRenderer("youtube", () => YoutubeBlock);
  }

  protected registerSerializers() {
    this.editor.registerSerializer("youtube", () => YoutubeBlockHTML);
  }

  public init() {
    this.registerKeyboardShortcuts();
    this.registerRenderers();
    this.registerSerializers();
  }
}

// Leaning towards a more composable approach
// extension = union([
//   defineKeyboardShortcut("y", () => {
//     this.editor.insertBlocks([{ type: "youtube" }]);
//   }),
//   defineRenderer("youtube", () => YoutubeBlock),
//   defineSerializer("youtube", () => YoutubeBlockHTML),
// ]);

editor2.modeExtension("youtube").overrideRenderer("youtube", YoutubeBlock);

// const schema = {
//   blocks: {
//     youtube: {
//       block: youtubeBlock,
//       view: YoutubeBlock,
//     },
//   },
// };

const schema = createSchema([youtubeBlock]);

// schema.override("youtube", {
//   view: YoutubeBlock,
// });

const edito = createEditor({
  schema,
  // schema: [youtubeBlock],
  // serializers: {
  // youtube: YoutubeBlockHTML
  // },
  // renderers: {
  // youtube: YoutubeBlock,
  // },
});

editor.registerRenderer("youtube", YoutubeBlock);
editor.registerSerializer("youtube", YoutubeBlockHTML);

// pdf extension
// TODO: react-pdf bundling
editor.extensions.pdf.registerRenderer("youtube", YoutubeBlock);
editor2.extensions.pdf.block.propSchema.validate({
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
});
function EditorRender() {
  return (
    <div
    // ref={(el) => {
    // edito.mount(el, {
    // renderers: {
    // youtube: YoutubeBlock,
    // },
    // });
    // }}
    ></div>
  );
}

// type EditorWithSideMenu = BlockEditor<
//   [typeof SlashMenuExtension, typeof YoutubeExtension]
// >;
const editor2 = createBlockEditor([SlashMenuExtension, YoutubeExtension]);

if (editor2.extensions["slashMenu"]) {
  editor2.extensions.slashMenu.registerItem({ name: "xyz", icon: "xyz" });
}
editor2.extensions.slashMenu.registerItem({ name: "xyz", icon: "xyz" });
// editor2.hasExtension("sideMenu");
// editor2.extensions.consumer.method(editor2);

// a) think / discuss more about UI setup
// b) assume we want a system like this, and go back to extension types / setup;

// const slashMenuExtension = createExtension("slashMenu", () => {
//   const itemStore = createStore([]);

//   return {
//     itemStore,
//     addSlashMenuItem(model: {
//       name: string;
//       icon: string; // icons
//       description: string; // translations
//       // onClick: () => void;
//     }) {
//       // itemStore.push(model);
//       return 3;
//     },
//   };
// });

// <SlashMenuView>
//   {editor.extensions.slashMenu.itemStore.map((item) => (
//     <div key={item.name}>{item.name}</div>
//   ))}
// </SlashMenuView>

// const slashMenuExtension = createExtension("slashMenu", (editor, callback) => {
//   const registeredItems = editor.schema.blocks.map((block) => ({
//     name: block.name,
//     ...callback(editor, block),
//   }));

//   return {
//     registeredItems,
//   };
// });

// <SlashMenuView renderItem={(block)=>{
//   return {
//     icon: map[block.type] ?? block.icon,
//   }
// }}>
//   {editor.extensions.slashMenu.registeredItems.map((item) => (
//     <div key={item.name}>{item.name}</div>
//   ))}
// </SlashMenuView>
