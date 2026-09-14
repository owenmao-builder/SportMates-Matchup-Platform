import handler from 'vinext/server/fetch-handler';
import { sweep } from './lib/club-server';
export default {
  fetch: handler.fetch,
  async scheduled(
    _controller: ScheduledController,
    env: Cloudflare.Env,
    _ctx: ExecutionContext,
  ) {
    await sweep(env, true);
  },
};
