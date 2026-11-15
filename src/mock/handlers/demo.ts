import { ok, type Handler } from '../context';

export const resetDemo: Handler = async (ctx) => {
  await ctx.store.reset(ctx.db.secret);
  return ok({ ok: true });
};
