import { useNavigate, useParams, useLocation } from 'react-router';
import { useBoardData } from '../app/BoardDataContext';
import { TaskDialog } from '../components/board/TaskDialog';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Spinner } from '../components/ui/Spinner';

/** `#/board/tasks/:taskId`: the task dialog as a deep-linkable route. */
export function TaskRoute() {
  const { taskId } = useParams();
  const { status, tasks } = useBoardData();
  const navigate = useNavigate();
  const location = useLocation();
  const close = () => navigate({ pathname: '/board', search: location.search });

  if (status === 'loading') {
    return (
      <Dialog title="Loading task" onClose={close} size="sm" showClose>
        <div role="status" className="flex items-center gap-2 p-6 text-sm text-slate-700">
          <Spinner className="size-4 text-brand" /> Loading task…
        </div>
      </Dialog>
    );
  }
  if (status === 'error') return null;

  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return (
      <Dialog
        title="Task not found"
        description="This task may have been deleted, or the link is wrong."
        onClose={close}
        size="sm"
        showClose
      >
        <div className="flex justify-end p-5 sm:px-6">
          <Button onClick={close}>Back to the board</Button>
        </div>
      </Dialog>
    );
  }
  // Remount when switching tasks so the form starts from the task's values.
  return <TaskDialog key={task.id} task={task} onClose={close} />;
}
