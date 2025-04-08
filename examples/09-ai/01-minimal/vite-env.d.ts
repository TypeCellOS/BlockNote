/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BLOCKNOTE_AI_SERVER_API_KEY: string;
  readonly VITE_BLOCKNOTE_AI_SERVER_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
