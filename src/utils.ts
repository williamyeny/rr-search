import * as dotenv from "dotenv";
dotenv.config();

const ENV_VARS = [
  "OPENAI_API_KEY",
  "PINECONE_API_KEY",
  "PINECONE_INDEX_URL",
] as const;
for (const envVar of ENV_VARS) {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing environment variable: ${envVar}. Please create a file named ".env" and set it there.`
    );
  }
}
export const getEnvVar = (name: (typeof ENV_VARS)[number]): string => {
  return process.env[name] as string;
};
