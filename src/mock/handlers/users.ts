import { toPublicUser, type DbUser } from '../db';
import { ok, type Handler } from '../context';
import { HttpError, notFound, validationError } from '../errors';
import { checkName, isErr, requireObject } from '../validation';

export const listUsers: Handler = (ctx) => {
  const users = ctx.db.users
    .map(toPublicUser)
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  return ok({ users });
};

export const patchUser: Handler = (ctx) => {
  const id =
    ctx.params['id'] === undefined || ctx.params['id'] === 'me' ? ctx.userId : ctx.params['id'];
  if (id !== ctx.userId) {
    if (!ctx.db.users.some((u) => u.id === id)) throw notFound('User not found.');
    throw new HttpError(403, 'forbidden', 'You can only edit your own account.');
  }
  const body = requireObject(ctx.body);
  const name = checkName(body['name']);
  if (isErr(name)) throw validationError({ name: name.error });
  const user = ctx.db.users.find((u) => u.id === id) as DbUser;
  user.name = name;
  ctx.store.save(ctx.db);
  return ok({ user: toPublicUser(user) });
};
