import type { AuthResult } from '../../api/types';
import { hashPassword, signToken, verifyPassword } from '../crypto';
import { toPublicUser, type DbUser } from '../db';
import { ok, type Ctx, type Handler } from '../context';
import { HttpError, validationError } from '../errors';
import { AVATAR_PALETTE } from '../../demoAccounts';
import {
  checkEmail,
  checkName,
  checkPassword,
  isErr,
  requireObject,
  throwIfAny,
} from '../validation';

async function issue(ctx: Ctx, user: DbUser): Promise<AuthResult> {
  const iat = Math.floor(ctx.now() / 1000);
  const exp = iat + Math.floor(ctx.tokenTtlMs / 1000);
  const token = await signToken({ sub: user.id, iat, exp }, ctx.db.secret);
  return { token, user: toPublicUser(user) };
}

export const register: Handler = async (ctx) => {
  const body = requireObject(ctx.body);
  const fields: Record<string, string> = {};
  const name = checkName(body['name']);
  const email = checkEmail(body['email']);
  const password = checkPassword(body['password']);
  if (isErr(name)) fields['name'] = name.error;
  if (isErr(email)) fields['email'] = email.error;
  if (isErr(password)) fields['password'] = password.error;
  throwIfAny(fields);
  if (isErr(name) || isErr(email) || isErr(password)) throw validationError(fields);

  const conflict = () =>
    new HttpError(409, 'conflict', 'An account with this email already exists.', {
      email: 'An account with this email already exists.',
    });
  if (ctx.db.users.some((u) => u.email === email)) throw conflict();

  const record = await hashPassword(password, ctx.iterations);
  // Re-read: another tab may have written while we were hashing.
  const db = await ctx.store.load();
  if (db.users.some((u) => u.email === email)) throw conflict();
  const user: DbUser = {
    id: `u-${crypto.randomUUID()}`,
    name,
    email,
    avatarColor: AVATAR_PALETTE[db.users.length % AVATAR_PALETTE.length] as string,
    createdAt: new Date(ctx.now()).toISOString(),
    ...record,
  };
  db.users.push(user);
  ctx.store.save(db);
  return ok(await issue({ ...ctx, db }, user), 201);
};

export const login: Handler = async (ctx) => {
  const body = requireObject(ctx.body);
  const fields: Record<string, string> = {};
  const rawEmail = body['email'];
  const rawPassword = body['password'];
  if (typeof rawEmail !== 'string' || rawEmail.trim() === '')
    fields['email'] = 'Enter your email address.';
  if (typeof rawPassword !== 'string' || rawPassword === '')
    fields['password'] = 'Enter your password.';
  throwIfAny(fields);

  const email = (rawEmail as string).trim().toLowerCase();
  const user = ctx.db.users.find((u) => u.email === email);
  // Hash even for unknown emails so timing does not reveal which accounts exist.
  const valid = user
    ? await verifyPassword(rawPassword as string, user)
    : (await hashPassword(rawPassword as string, ctx.iterations), false);
  if (!user || !valid) {
    throw new HttpError(401, 'invalid_credentials', 'Incorrect email or password.');
  }
  return ok(await issue(ctx, user));
};

export const me: Handler = (ctx) => {
  const user = ctx.db.users.find((u) => u.id === ctx.userId) as DbUser;
  return ok({ user: toPublicUser(user) });
};
