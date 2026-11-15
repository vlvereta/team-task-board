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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-5">
        <Link
          to="/board"
          className="focus-ring-light flex shrink-0 items-center gap-2 rounded-md"
          aria-label="Crewboard home"
        >
          <LogoMark className="size-8" />
          <span className="hidden font-bold tracking-tight md:inline">Crewboard</span>
        </Link>
        <span aria-hidden="true" className="hidden h-6 w-px bg-white/20 md:block" />
        <div className="flex min-w-0 flex-1 basis-40 items-center">
          <BoardName />
        </div>
        <nav aria-label="Account" className="flex flex-wrap items-center gap-1 sm:gap-2">
          {onBoard && (
            <button
              type="button"
              aria-pressed={mine}
              onClick={() => setMine(!mine)}
              className={`focus-ring-light inline-flex min-h-touch items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
                mine
                  ? 'bg-accent text-slate-900 hover:bg-amber-300'
                  : 'bg-white/10 text-white hover:bg-white/20'
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
              `focus-ring-light inline-flex min-h-touch items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-white/15 ${isActive ? 'bg-white/15' : ''}`
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
            <span className="flex items-center gap-2 pl-1">
              <Avatar name={user.name} color={user.avatarColor} labelled={false} />
              <span className="hidden max-w-40 truncate text-sm lg:inline">{user.name}</span>
              <span className="sr-only">Signed in as {user.name}</span>
            </span>
          )}
          <button
            type="button"
            onClick={logout}
            className="focus-ring-light inline-flex min-h-touch items-center rounded-lg px-3 text-sm font-semibold hover:bg-white/15"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
