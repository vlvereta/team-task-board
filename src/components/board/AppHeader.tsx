import { Link, NavLink, useMatch } from 'react-router';
import { useAuth } from '../../app/AuthContext';
import { useMyTasksFilter } from '../../lib/useMyTasksFilter';
import { Avatar } from '../ui/Avatar';
import { LogoMark } from '../ui/Logo';
import { BoardName } from './BoardName';

export function AppHeader() {
  const { user, logout } = useAuth();
  const onBoard = useMatch('/board/*');
  const [mine, setMine] = useMyTasksFilter();

  return (
    <header className="shrink-0 border-b border-white/10 bg-board-deep text-white">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 sm:gap-x-3 sm:px-5 sm:py-2">
        <Link
          to="/board"
          className="focus-ring-light flex min-h-touch min-w-touch shrink-0 items-center justify-center gap-2 rounded-md"
          aria-label="Crewboard home"
        >
          <LogoMark className="size-8" />
          <span className="hidden font-bold tracking-tight md:inline">Crewboard</span>
        </Link>
        <span aria-hidden="true" className="hidden h-6 w-px bg-white/20 md:block" />
        <div className="flex min-w-0 flex-1 basis-40 items-center">
          <BoardName />
        </div>
        <nav aria-label="Account" className="ml-auto flex flex-wrap items-center gap-1 sm:gap-2">
          {onBoard && (
            <button
              type="button"
              aria-pressed={mine}
              onClick={() => setMine(!mine)}
              className={`focus-ring-light inline-flex min-h-touch items-center gap-2 rounded-lg px-2 text-sm font-semibold transition-colors sm:px-3 ${
                mine
                  ? 'bg-accent text-slate-900 hover:bg-amber-300'
                  : 'text-white ring-1 ring-inset ring-white/45 hover:bg-white/15'
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="currentColor">
                <path d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 1 1 14 0H3Z" />
              </svg>
              My tasks
            </button>
          )}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `focus-ring-light inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold hover:bg-white/15 sm:px-3 ${isActive ? 'bg-white/15' : ''}`
            }
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.3 1.9a1 1 0 0 1 1-.9h1.4a1 1 0 0 1 1 .9l.2 1.6c.5.2 1 .5 1.4.8l1.5-.6a1 1 0 0 1 1.2.4l.7 1.2a1 1 0 0 1-.2 1.3l-1.3 1c.1.6.1 1.2 0 1.8l1.3 1a1 1 0 0 1 .2 1.3l-.7 1.2a1 1 0 0 1-1.2.4l-1.5-.6c-.4.3-.9.6-1.4.8l-.2 1.6a1 1 0 0 1-1 .9H9.3a1 1 0 0 1-1-.9l-.2-1.6c-.5-.2-1-.5-1.4-.8l-1.5.6a1 1 0 0 1-1.2-.4l-.7-1.2a1 1 0 0 1 .2-1.3l1.3-1a5.6 5.6 0 0 1 0-1.8l-1.3-1A1 1 0 0 1 3.3 5l.7-1.2a1 1 0 0 1 1.2-.4l1.5.6c.4-.3.9-.6 1.4-.8l.2-1.6ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                clipRule="evenodd"
              />
            </svg>
            <span className="max-sm:sr-only">Settings</span>
          </NavLink>
          {user && (
            <span className="hidden items-center gap-2 pl-1 sm:flex">
              <Avatar name={user.name} color={user.avatarColor} labelled={false} />
              <span className="hidden max-w-40 truncate text-sm lg:inline">{user.name}</span>
              <span className="sr-only">Signed in as {user.name}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => logout()}
            className="focus-ring-light inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold hover:bg-white/15 sm:px-3"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="size-4 sm:hidden"
              fill="currentColor"
            >
              <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h6A1.5 1.5 0 0 1 12 4.5V7h-1.5V4.5h-6v11h6V13H12v2.5a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 3 15.5v-11Zm11.2 2.2 3.3 3.3-3.3 3.3-1.06-1.06 1.49-1.49H7.5v-1.5h7.13l-1.49-1.49 1.06-1.06Z" />
            </svg>
            <span className="max-sm:sr-only">Log out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
