import { useRouteError } from 'react-router';
import { Button } from '../components/ui/Button';

/** Shown instead of a blank page if something unexpected breaks while rendering. */
export function RouteError() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-board p-4">
      <div role="alert" className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-lg">
        <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-700">
          The page hit an unexpected problem. Your saved work is safe. Reload to carry on.
        </p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  );
}
