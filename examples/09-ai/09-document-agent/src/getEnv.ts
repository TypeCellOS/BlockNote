// helper function to get env variables across next / vite
// only needed so this example works in BlockNote demos and docs
export function getEnv(key: string) {
  const env = (import.meta as any).env
    ? {
        BLOCKNOTE_AI_SERVER_API_KEY: (import.meta as any).env
          .VITE_BLOCKNOTE_AI_SERVER_API_KEY,
        BLOCKNOTE_AI_SERVER_BASE_URL: (import.meta as any).env
          .VITE_BLOCKNOTE_AI_SERVER_BASE_URL,
      }
    : {
        BLOCKNOTE_AI_SERVER_API_KEY:
          process.env.NEXT_PUBLIC_BLOCKNOTE_AI_SERVER_API_KEY,
        BLOCKNOTE_AI_SERVER_BASE_URL:
          process.env.NEXT_PUBLIC_BLOCKNOTE_AI_SERVER_BASE_URL,
      };

  const value = env[key as keyof typeof env];
  return value;
}
