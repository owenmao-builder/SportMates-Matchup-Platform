import { env } from 'cloudflare:workers';
import { handleClub } from '@/lib/club-server';
export const dynamic = 'force-dynamic';
export function GET(request: Request) {
  return handleClub(request, env as Cloudflare.Env);
}
export function POST(request: Request) {
  return handleClub(request, env as Cloudflare.Env);
}
