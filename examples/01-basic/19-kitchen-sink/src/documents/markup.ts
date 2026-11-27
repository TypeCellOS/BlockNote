import type { KitchenSinkBlock } from "../schema.js";

export const markup: KitchenSinkBlock[] = [
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "bold",
        styles: {
          bold: true,
        },
      },
    ],
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "italic",
        styles: {
          italic: true,
        },
      },
    ],
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "underline",
        styles: {
          underline: true,
        },
      },
    ],
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "strike",
        styles: {
          strike: true,
        },
      },
    ],
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "code",
        styles: {
          code: true,
        },
      },
    ],
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Combined emphasis",
        styles: {
          bold: true,
          italic: true,
          underline: true,
          strike: true,
        },
      },
    ],
  },
  {
    type: "paragraph",
    content: [
      {
        type: "link",
        href: "https://www.blocknotejs.org",
        content: "BlockNote website",
      },
      " and inline math: ",
      {
        type: "math",
        content: "e^{i\\pi}+1=0",
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "default",
    },
    content: "Block: default text / default background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: default text / default highlight",
        styles: {
          textColor: "default",
          backgroundColor: "default",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "gray",
      backgroundColor: "default",
    },
    content: "Block: gray text / default background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: gray text / default highlight",
        styles: {
          textColor: "gray",
          backgroundColor: "default",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "brown",
      backgroundColor: "default",
    },
    content: "Block: brown text / default background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: brown text / default highlight",
        styles: {
          textColor: "brown",
          backgroundColor: "default",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "red",
      backgroundColor: "default",
    },
    content: "Block: red text / default background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: red text / default highlight",
        styles: {
          textColor: "red",
          backgroundColor: "default",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "orange",
      backgroundColor: "default",
    },
    content: "Block: orange text / default background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: orange text / default highlight",
        styles: {
          textColor: "orange",
          backgroundColor: "default",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "yellow",
      backgroundColor: "default",
    },
    content: "Block: yellow text / default background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: yellow text / default highlight",
        styles: {
          textColor: "yellow",
          backgroundColor: "default",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "green",
      backgroundColor: "default",
    },
    content: "Block: green text / default background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: green text / default highlight",
        styles: {
          textColor: "green",
          backgroundColor: "default",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "blue",
      backgroundColor: "default",
    },
    content: "Block: blue text / default background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: blue text / default highlight",
        styles: {
          textColor: "blue",
          backgroundColor: "default",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "purple",
      backgroundColor: "default",
    },
    content: "Block: purple text / default background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: purple text / default highlight",
        styles: {
          textColor: "purple",
          backgroundColor: "default",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "pink",
      backgroundColor: "default",
    },
    content: "Block: pink text / default background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: pink text / default highlight",
        styles: {
          textColor: "pink",
          backgroundColor: "default",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "gray",
    },
    content: "Block: default text / gray background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: default text / gray highlight",
        styles: {
          textColor: "default",
          backgroundColor: "gray",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "gray",
      backgroundColor: "gray",
    },
    content: "Block: gray text / gray background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: gray text / gray highlight",
        styles: {
          textColor: "gray",
          backgroundColor: "gray",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "brown",
      backgroundColor: "gray",
    },
    content: "Block: brown text / gray background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: brown text / gray highlight",
        styles: {
          textColor: "brown",
          backgroundColor: "gray",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "red",
      backgroundColor: "gray",
    },
    content: "Block: red text / gray background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: red text / gray highlight",
        styles: {
          textColor: "red",
          backgroundColor: "gray",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "orange",
      backgroundColor: "gray",
    },
    content: "Block: orange text / gray background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: orange text / gray highlight",
        styles: {
          textColor: "orange",
          backgroundColor: "gray",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "yellow",
      backgroundColor: "gray",
    },
    content: "Block: yellow text / gray background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: yellow text / gray highlight",
        styles: {
          textColor: "yellow",
          backgroundColor: "gray",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "green",
      backgroundColor: "gray",
    },
    content: "Block: green text / gray background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: green text / gray highlight",
        styles: {
          textColor: "green",
          backgroundColor: "gray",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "blue",
      backgroundColor: "gray",
    },
    content: "Block: blue text / gray background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: blue text / gray highlight",
        styles: {
          textColor: "blue",
          backgroundColor: "gray",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "purple",
      backgroundColor: "gray",
    },
    content: "Block: purple text / gray background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: purple text / gray highlight",
        styles: {
          textColor: "purple",
          backgroundColor: "gray",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "pink",
      backgroundColor: "gray",
    },
    content: "Block: pink text / gray background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: pink text / gray highlight",
        styles: {
          textColor: "pink",
          backgroundColor: "gray",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "brown",
    },
    content: "Block: default text / brown background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: default text / brown highlight",
        styles: {
          textColor: "default",
          backgroundColor: "brown",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "gray",
      backgroundColor: "brown",
    },
    content: "Block: gray text / brown background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: gray text / brown highlight",
        styles: {
          textColor: "gray",
          backgroundColor: "brown",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "brown",
      backgroundColor: "brown",
    },
    content: "Block: brown text / brown background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: brown text / brown highlight",
        styles: {
          textColor: "brown",
          backgroundColor: "brown",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "red",
      backgroundColor: "brown",
    },
    content: "Block: red text / brown background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: red text / brown highlight",
        styles: {
          textColor: "red",
          backgroundColor: "brown",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "orange",
      backgroundColor: "brown",
    },
    content: "Block: orange text / brown background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: orange text / brown highlight",
        styles: {
          textColor: "orange",
          backgroundColor: "brown",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "yellow",
      backgroundColor: "brown",
    },
    content: "Block: yellow text / brown background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: yellow text / brown highlight",
        styles: {
          textColor: "yellow",
          backgroundColor: "brown",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "green",
      backgroundColor: "brown",
    },
    content: "Block: green text / brown background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: green text / brown highlight",
        styles: {
          textColor: "green",
          backgroundColor: "brown",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "blue",
      backgroundColor: "brown",
    },
    content: "Block: blue text / brown background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: blue text / brown highlight",
        styles: {
          textColor: "blue",
          backgroundColor: "brown",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "purple",
      backgroundColor: "brown",
    },
    content: "Block: purple text / brown background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: purple text / brown highlight",
        styles: {
          textColor: "purple",
          backgroundColor: "brown",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "pink",
      backgroundColor: "brown",
    },
    content: "Block: pink text / brown background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: pink text / brown highlight",
        styles: {
          textColor: "pink",
          backgroundColor: "brown",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "red",
    },
    content: "Block: default text / red background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: default text / red highlight",
        styles: {
          textColor: "default",
          backgroundColor: "red",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "gray",
      backgroundColor: "red",
    },
    content: "Block: gray text / red background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: gray text / red highlight",
        styles: {
          textColor: "gray",
          backgroundColor: "red",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "brown",
      backgroundColor: "red",
    },
    content: "Block: brown text / red background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: brown text / red highlight",
        styles: {
          textColor: "brown",
          backgroundColor: "red",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "red",
      backgroundColor: "red",
    },
    content: "Block: red text / red background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: red text / red highlight",
        styles: {
          textColor: "red",
          backgroundColor: "red",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "orange",
      backgroundColor: "red",
    },
    content: "Block: orange text / red background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: orange text / red highlight",
        styles: {
          textColor: "orange",
          backgroundColor: "red",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "yellow",
      backgroundColor: "red",
    },
    content: "Block: yellow text / red background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: yellow text / red highlight",
        styles: {
          textColor: "yellow",
          backgroundColor: "red",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "green",
      backgroundColor: "red",
    },
    content: "Block: green text / red background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: green text / red highlight",
        styles: {
          textColor: "green",
          backgroundColor: "red",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "blue",
      backgroundColor: "red",
    },
    content: "Block: blue text / red background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: blue text / red highlight",
        styles: {
          textColor: "blue",
          backgroundColor: "red",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "purple",
      backgroundColor: "red",
    },
    content: "Block: purple text / red background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: purple text / red highlight",
        styles: {
          textColor: "purple",
          backgroundColor: "red",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "pink",
      backgroundColor: "red",
    },
    content: "Block: pink text / red background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: pink text / red highlight",
        styles: {
          textColor: "pink",
          backgroundColor: "red",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "orange",
    },
    content: "Block: default text / orange background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: default text / orange highlight",
        styles: {
          textColor: "default",
          backgroundColor: "orange",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "gray",
      backgroundColor: "orange",
    },
    content: "Block: gray text / orange background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: gray text / orange highlight",
        styles: {
          textColor: "gray",
          backgroundColor: "orange",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "brown",
      backgroundColor: "orange",
    },
    content: "Block: brown text / orange background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: brown text / orange highlight",
        styles: {
          textColor: "brown",
          backgroundColor: "orange",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "red",
      backgroundColor: "orange",
    },
    content: "Block: red text / orange background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: red text / orange highlight",
        styles: {
          textColor: "red",
          backgroundColor: "orange",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "orange",
      backgroundColor: "orange",
    },
    content: "Block: orange text / orange background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: orange text / orange highlight",
        styles: {
          textColor: "orange",
          backgroundColor: "orange",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "yellow",
      backgroundColor: "orange",
    },
    content: "Block: yellow text / orange background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: yellow text / orange highlight",
        styles: {
          textColor: "yellow",
          backgroundColor: "orange",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "green",
      backgroundColor: "orange",
    },
    content: "Block: green text / orange background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: green text / orange highlight",
        styles: {
          textColor: "green",
          backgroundColor: "orange",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "blue",
      backgroundColor: "orange",
    },
    content: "Block: blue text / orange background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: blue text / orange highlight",
        styles: {
          textColor: "blue",
          backgroundColor: "orange",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "purple",
      backgroundColor: "orange",
    },
    content: "Block: purple text / orange background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: purple text / orange highlight",
        styles: {
          textColor: "purple",
          backgroundColor: "orange",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "pink",
      backgroundColor: "orange",
    },
    content: "Block: pink text / orange background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: pink text / orange highlight",
        styles: {
          textColor: "pink",
          backgroundColor: "orange",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "yellow",
    },
    content: "Block: default text / yellow background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: default text / yellow highlight",
        styles: {
          textColor: "default",
          backgroundColor: "yellow",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "gray",
      backgroundColor: "yellow",
    },
    content: "Block: gray text / yellow background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: gray text / yellow highlight",
        styles: {
          textColor: "gray",
          backgroundColor: "yellow",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "brown",
      backgroundColor: "yellow",
    },
    content: "Block: brown text / yellow background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: brown text / yellow highlight",
        styles: {
          textColor: "brown",
          backgroundColor: "yellow",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "red",
      backgroundColor: "yellow",
    },
    content: "Block: red text / yellow background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: red text / yellow highlight",
        styles: {
          textColor: "red",
          backgroundColor: "yellow",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "orange",
      backgroundColor: "yellow",
    },
    content: "Block: orange text / yellow background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: orange text / yellow highlight",
        styles: {
          textColor: "orange",
          backgroundColor: "yellow",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "yellow",
      backgroundColor: "yellow",
    },
    content: "Block: yellow text / yellow background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: yellow text / yellow highlight",
        styles: {
          textColor: "yellow",
          backgroundColor: "yellow",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "green",
      backgroundColor: "yellow",
    },
    content: "Block: green text / yellow background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: green text / yellow highlight",
        styles: {
          textColor: "green",
          backgroundColor: "yellow",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "blue",
      backgroundColor: "yellow",
    },
    content: "Block: blue text / yellow background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: blue text / yellow highlight",
        styles: {
          textColor: "blue",
          backgroundColor: "yellow",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "purple",
      backgroundColor: "yellow",
    },
    content: "Block: purple text / yellow background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: purple text / yellow highlight",
        styles: {
          textColor: "purple",
          backgroundColor: "yellow",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "pink",
      backgroundColor: "yellow",
    },
    content: "Block: pink text / yellow background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: pink text / yellow highlight",
        styles: {
          textColor: "pink",
          backgroundColor: "yellow",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "green",
    },
    content: "Block: default text / green background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: default text / green highlight",
        styles: {
          textColor: "default",
          backgroundColor: "green",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "gray",
      backgroundColor: "green",
    },
    content: "Block: gray text / green background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: gray text / green highlight",
        styles: {
          textColor: "gray",
          backgroundColor: "green",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "brown",
      backgroundColor: "green",
    },
    content: "Block: brown text / green background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: brown text / green highlight",
        styles: {
          textColor: "brown",
          backgroundColor: "green",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "red",
      backgroundColor: "green",
    },
    content: "Block: red text / green background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: red text / green highlight",
        styles: {
          textColor: "red",
          backgroundColor: "green",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "orange",
      backgroundColor: "green",
    },
    content: "Block: orange text / green background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: orange text / green highlight",
        styles: {
          textColor: "orange",
          backgroundColor: "green",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "yellow",
      backgroundColor: "green",
    },
    content: "Block: yellow text / green background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: yellow text / green highlight",
        styles: {
          textColor: "yellow",
          backgroundColor: "green",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "green",
      backgroundColor: "green",
    },
    content: "Block: green text / green background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: green text / green highlight",
        styles: {
          textColor: "green",
          backgroundColor: "green",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "blue",
      backgroundColor: "green",
    },
    content: "Block: blue text / green background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: blue text / green highlight",
        styles: {
          textColor: "blue",
          backgroundColor: "green",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "purple",
      backgroundColor: "green",
    },
    content: "Block: purple text / green background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: purple text / green highlight",
        styles: {
          textColor: "purple",
          backgroundColor: "green",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "pink",
      backgroundColor: "green",
    },
    content: "Block: pink text / green background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: pink text / green highlight",
        styles: {
          textColor: "pink",
          backgroundColor: "green",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "blue",
    },
    content: "Block: default text / blue background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: default text / blue highlight",
        styles: {
          textColor: "default",
          backgroundColor: "blue",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "gray",
      backgroundColor: "blue",
    },
    content: "Block: gray text / blue background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: gray text / blue highlight",
        styles: {
          textColor: "gray",
          backgroundColor: "blue",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "brown",
      backgroundColor: "blue",
    },
    content: "Block: brown text / blue background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: brown text / blue highlight",
        styles: {
          textColor: "brown",
          backgroundColor: "blue",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "red",
      backgroundColor: "blue",
    },
    content: "Block: red text / blue background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: red text / blue highlight",
        styles: {
          textColor: "red",
          backgroundColor: "blue",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "orange",
      backgroundColor: "blue",
    },
    content: "Block: orange text / blue background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: orange text / blue highlight",
        styles: {
          textColor: "orange",
          backgroundColor: "blue",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "yellow",
      backgroundColor: "blue",
    },
    content: "Block: yellow text / blue background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: yellow text / blue highlight",
        styles: {
          textColor: "yellow",
          backgroundColor: "blue",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "green",
      backgroundColor: "blue",
    },
    content: "Block: green text / blue background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: green text / blue highlight",
        styles: {
          textColor: "green",
          backgroundColor: "blue",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "blue",
      backgroundColor: "blue",
    },
    content: "Block: blue text / blue background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: blue text / blue highlight",
        styles: {
          textColor: "blue",
          backgroundColor: "blue",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "purple",
      backgroundColor: "blue",
    },
    content: "Block: purple text / blue background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: purple text / blue highlight",
        styles: {
          textColor: "purple",
          backgroundColor: "blue",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "pink",
      backgroundColor: "blue",
    },
    content: "Block: pink text / blue background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: pink text / blue highlight",
        styles: {
          textColor: "pink",
          backgroundColor: "blue",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "purple",
    },
    content: "Block: default text / purple background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: default text / purple highlight",
        styles: {
          textColor: "default",
          backgroundColor: "purple",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "gray",
      backgroundColor: "purple",
    },
    content: "Block: gray text / purple background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: gray text / purple highlight",
        styles: {
          textColor: "gray",
          backgroundColor: "purple",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "brown",
      backgroundColor: "purple",
    },
    content: "Block: brown text / purple background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: brown text / purple highlight",
        styles: {
          textColor: "brown",
          backgroundColor: "purple",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "red",
      backgroundColor: "purple",
    },
    content: "Block: red text / purple background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: red text / purple highlight",
        styles: {
          textColor: "red",
          backgroundColor: "purple",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "orange",
      backgroundColor: "purple",
    },
    content: "Block: orange text / purple background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: orange text / purple highlight",
        styles: {
          textColor: "orange",
          backgroundColor: "purple",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "yellow",
      backgroundColor: "purple",
    },
    content: "Block: yellow text / purple background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: yellow text / purple highlight",
        styles: {
          textColor: "yellow",
          backgroundColor: "purple",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "green",
      backgroundColor: "purple",
    },
    content: "Block: green text / purple background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: green text / purple highlight",
        styles: {
          textColor: "green",
          backgroundColor: "purple",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "blue",
      backgroundColor: "purple",
    },
    content: "Block: blue text / purple background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: blue text / purple highlight",
        styles: {
          textColor: "blue",
          backgroundColor: "purple",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "purple",
      backgroundColor: "purple",
    },
    content: "Block: purple text / purple background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: purple text / purple highlight",
        styles: {
          textColor: "purple",
          backgroundColor: "purple",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "pink",
      backgroundColor: "purple",
    },
    content: "Block: pink text / purple background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: pink text / purple highlight",
        styles: {
          textColor: "pink",
          backgroundColor: "purple",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "pink",
    },
    content: "Block: default text / pink background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: default text / pink highlight",
        styles: {
          textColor: "default",
          backgroundColor: "pink",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "gray",
      backgroundColor: "pink",
    },
    content: "Block: gray text / pink background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: gray text / pink highlight",
        styles: {
          textColor: "gray",
          backgroundColor: "pink",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "brown",
      backgroundColor: "pink",
    },
    content: "Block: brown text / pink background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: brown text / pink highlight",
        styles: {
          textColor: "brown",
          backgroundColor: "pink",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "red",
      backgroundColor: "pink",
    },
    content: "Block: red text / pink background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: red text / pink highlight",
        styles: {
          textColor: "red",
          backgroundColor: "pink",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "orange",
      backgroundColor: "pink",
    },
    content: "Block: orange text / pink background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: orange text / pink highlight",
        styles: {
          textColor: "orange",
          backgroundColor: "pink",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "yellow",
      backgroundColor: "pink",
    },
    content: "Block: yellow text / pink background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: yellow text / pink highlight",
        styles: {
          textColor: "yellow",
          backgroundColor: "pink",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "green",
      backgroundColor: "pink",
    },
    content: "Block: green text / pink background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: green text / pink highlight",
        styles: {
          textColor: "green",
          backgroundColor: "pink",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "blue",
      backgroundColor: "pink",
    },
    content: "Block: blue text / pink background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: blue text / pink highlight",
        styles: {
          textColor: "blue",
          backgroundColor: "pink",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "purple",
      backgroundColor: "pink",
    },
    content: "Block: purple text / pink background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: purple text / pink highlight",
        styles: {
          textColor: "purple",
          backgroundColor: "pink",
        },
      },
    ],
  },
  {
    type: "paragraph",
    props: {
      textColor: "pink",
      backgroundColor: "pink",
    },
    content: "Block: pink text / pink background",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline: pink text / pink highlight",
        styles: {
          textColor: "pink",
          backgroundColor: "pink",
        },
      },
    ],
  },
];
