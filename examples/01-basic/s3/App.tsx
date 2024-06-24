import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  // GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: "",
    secretAccessKey: "",
  },
});

export default function App() {
  const editor = useCreateBlockNote({
    uploadFile: async (file) => {
      await client.send(
        new PutObjectCommand({
          Bucket: "blocknote-s3-example",
          Key: file.name,
          Body: file,
        })
      );

      return `https://blocknote-s3-example.s3.amazonaws.com/${file.name}`;
    },
    // resolveFileUrl: async (url) => {
    //   if (url.startsWith("s3:")) {
    //     await client.send(
    //       new GetObjectCommand({
    //         Bucket: "blocknote-s3-example",
    //         Key: url.slice(3),
    //       })
    //     );
    //
    //     return url.slice(3);
    //   }
    //
    //   return url;
    // },
  });

  // Renders the editor instance.
  return <BlockNoteView editor={editor} />;
}
