import { describe, expect, it } from 'vitest';
import type { Task, TaskStatus } from '../api/types';
import { applyMove, groupByStatus, positionInFullColumn } from './ordering';

function t(id: string, status: TaskStatus, position: number): Task {
  return {
    id,
    title: id,
    description: '',
    status,
    position,
    assigneeId: null,
    createdBy: 'u',
    createdAt: '',
    updatedAt: '',
  };
}

const ids = (tasks: Task[], s: TaskStatus) => groupByStatus(tasks)[s].map((x) => x.id);

describe('applyMove', () => {
  const base = [t('a', 'todo', 0), t('b', 'todo', 1), t('c', 'todo', 2), t('d', 'done', 0)];

  it('moves across columns and renumbers both', () => {
    const r = applyMove(base, 'b', 'done', 0);
    expect(ids(r, 'todo')).toEqual(['a', 'c']);
    expect(ids(r, 'done')).toEqual(['b', 'd']);
    expect(groupByStatus(r).todo.map((x) => x.position)).toEqual([0, 1]);
    expect(groupByStatus(r).done.map((x) => x.position)).toEqual([0, 1]);
  });

  it('reorders within a column in both directions', () => {
    expect(ids(applyMove(base, 'a', 'todo', 2), 'todo')).toEqual(['b', 'c', 'a']);
    expect(ids(applyMove(base, 'c', 'todo', 0), 'todo')).toEqual(['c', 'a', 'b']);
  });

  it('clamps positions past the end', () => {
    expect(ids(applyMove(base, 'a', 'done', 99), 'done')).toEqual(['d', 'a']);
  });

  it('ignores unknown ids', () => {
    expect(applyMove(base, 'zzz', 'done', 0)).toBe(base);
  });
});

describe('positionInFullColumn', () => {
  // Full column (without moved X): a b c d ; visible (filtered): b d
  const full = ['a', 'b', 'c', 'd'];
  it('places after the preceding visible card', () => {
    expect(positionInFullColumn(full, ['b', 'X', 'd'], 'X')).toBe(2);
  });
  it('places before the following visible card when first', () => {
    expect(positionInFullColumn(full, ['X', 'b', 'd'], 'X')).toBe(1);
  });
  it('goes to the end when no visible neighbours', () => {
    expect(positionInFullColumn(full, ['X'], 'X')).toBe(4);
  });
  it('is the plain index when nothing is filtered', () => {
    expect(positionInFullColumn(['a', 'b'], ['a', 'X', 'b'], 'X')).toBe(1);
  });
});
