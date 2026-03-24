import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  GEMINI_API_KEY: z.string().default("mock-key-for-development"),
  STORAGE_ADAPTER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./uploads"),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  MAX_AUDIO_SIZE_MB: z.coerce.number().default(100),
  MAX_ATTACHMENT_SIZE_MB: z.coerce.number().default(25),
  WORKER_CONCURRENCY: z.coerce.number().default(1),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  _env = parsed.data;
  return _env;
}

export function getMaxAudioSizeBytes(): number {
  return getEnv().MAX_AUDIO_SIZE_MB * 1024 * 1024;
}

export function getMaxAttachmentSizeBytes(): number {
  return getEnv().MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;
}
