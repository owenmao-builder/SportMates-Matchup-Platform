/// <reference types="@cloudflare/workers-types" />
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    ARK_API_KEY: string;
    AVATAR_IMAGE_MODEL: string;
    ADMIN_PASSWORD_HASH: string;
    JOB_SECRET: string;
    APP_ORIGIN: string;
  }
}
