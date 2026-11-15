import { BOARD_NAME_MAX_LENGTH, type Board } from '../../api/types';
import type { Db } from '../db';
import { ok, type Handler } from '../context';
import { validationError } from '../errors';
import { checkName, isErr, requireObject } from '../validation';

export const toBoard = (db: Db): Board => ({
  id: db.board.id,
  name: db.board.name,
  columns: [
    { id: 'todo', title: 'To Do' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'done', title: 'Done' },
  ],
});

export const getBoard: Handler = (ctx) => ok({ board: toBoard(ctx.db) });

export const patchBoard: Handler = (ctx) => {
  const body = requireObject(ctx.body);
  const name = checkName(body['name'], BOARD_NAME_MAX_LENGTH);
  if (isErr(name)) throw validationError({ name: name.error });
  ctx.db.board.name = name;
  ctx.store.save(ctx.db);
  return ok({ board: toBoard(ctx.db) });
};
