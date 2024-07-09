import {
  // GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

const client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: "",
    secretAccessKey: "",
  },
});

const createPresignedUrlWithClient = (opts: {
  region: string;
  bucket: string;
  key: string;
}) => {
  const { region, bucket, key } = opts;
  const client = new S3Client({ region });
  const command = new PutObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: 3600 });
};

export default function App() {
  const editor = useCreateBlockNote({
    uploadFile: async (file) => {
      debugger;
      const signedUrl = await createPresignedUrlWithClient({
        region: "us-east-1",
        bucket: "blocknote-demo",
        key: file.name,
      });

      const headers: any = {};
      if (file?.type) {
        headers["Content-Type"] = file!.type;
      }

      const uploaded = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers,
      });

      await client.send(
        new PutObjectCommand({
          Bucket: "blocknote-demo",
          Key: file.name,
          Body: file,
        })
      );
      debugger;
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
