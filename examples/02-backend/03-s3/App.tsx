import {
  GetObjectCommand,
  // GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  S3RequestPresigner,
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

/**
 * SERVER Code. Normally, this part would be implemented on your server, so you
 * can hide your AWS credentials and control access to your S3 bucket.
 *
 * In our demo, we are using a public S3 bucket so everything can be done in
 * the client.
 */

// Set up the AWS SDK.
const client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: "",
    secretAccessKey: "",
  },
});

/**
 * The method on the server that generates a pre-signed URL for a PUT request.
 */
const SERVER_createPresignedUrlPUT = (opts: {
  bucket: string;
  key: string;
}) => {
  // This function would normally be implemented on your server. Of course, you
  // should make sure the calling user is authenticated, etc.
  const { bucket, key } = opts;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
};

/**
 * The method on the server that generates a pre-signed URL for a GET request.
 */
const SERVER_createPresignedUrlGET = (opts: {
  bucket: string;
  key: string;
}) => {
  // This function would normally be implemented on your server. Of course, you
  // should make sure the calling user is authenticated, etc.
  const { bucket, key } = opts;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
};

/**
 * CLIENT code
 */
export default function App() {
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
        content: "Upload an image to S3 using the button below",
      },
      {
        type: "image",
      },
      {
        type: "paragraph",
      },
    ],
    uploadFile: async (file) => {
      /**
       * This function is called by BlockNote whenever it wants to upload a
       * file. In this implementation, we are uploading the file to an S3 bucket
       * by first requesting an upload URL from the server.
       */
      const bucket = "blocknote-demo";
      const key = file.name;

      // Get a URL to upload to from the server.
      const signedUrl = await SERVER_createPresignedUrlPUT({
        bucket,
        key,
      });

      const headers: any = {};
      if (file?.type) {
        // S3 requires setting the correct content type.
        headers["Content-Type"] = file!.type || "application/octet-stream";
      }

      // Actually upload the file.
      const uploaded = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers,
      });

      if (!uploaded.ok) {
        throw new Error("Failed to upload file");
      }

      // We store the URL in a custom format, in this case s3://bucket/key.
      // We'll subsequently parse this URL in the resolveFileUrl function.
      return `s3://${bucket}/${key}`;
    },
    resolveFileUrl: async (url) => {
      /**
       * This function is called by BlockNote whenever it needs to use URL from
       * a file block. For example, when displaying an image or downloading a
       * file.
       *
       * In this implementation, we are parsing our custom format and return a
       * signed URL from our backend.
       */
      if (url.startsWith("s3:")) {
        // it's our custom format, request a signed url from the backend
        const [, , bucket, key] = url.split("/", 4);
        const presignedUrl = await SERVER_createPresignedUrlGET({
          bucket,
          key,
        });
        return presignedUrl;
      }

      return url;
    },
  });

  // Renders the editor instance.
  return <BlockNoteView editor={editor} />;
}

// This is a hack to make sure the S3RequestPresigner is not used (our demo
// bucket is configured for anonymous access). Remove this in your own code.
S3RequestPresigner.prototype.presign = (request: any) => request;
