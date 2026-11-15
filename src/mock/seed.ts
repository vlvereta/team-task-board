import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../demoAccounts';
import type { Task, TaskStatus } from '../api/types';
import { hashPassword, randomSecret } from './crypto';
import { SCHEMA_VERSION, type Db, type DbUser } from './db';

export const MAIN_BOARD_ID = 'b-main';

interface SeedTask {
  title: string;
  description: string;
  status: TaskStatus;
  assignee: string | null;
}

const SEED_TASKS: SeedTask[] = [
  {
    title: 'Audit the current site content',
    description:
      'List every page on the old site with its traffic and last update. Mark each page as keep, merge or retire so we only migrate what matters.',
    status: 'done',
    assignee: 'u-emma',
  },
  {
    title: 'Define the new sitemap',
    description:
      'Agree the top-level navigation with the stakeholders. Keep it to six items or fewer.',
    status: 'done',
    assignee: 'u-ana',
  },
  {
    title: 'Set up staging environment',
    description: '',
    status: 'done',
    assignee: 'u-dev',
  },
  {
    title: 'Design the homepage hero',
    description:
      'Explore three directions and share them in the design channel. We need one final layout for desktop and one for mobile before development starts.',
    status: 'in_progress',
    assignee: 'u-chloe',
  },
  {
    title: 'Build the responsive navigation',
    description:
      'Implement the header and the mobile menu. It must be fully keyboard accessible and work without JavaScript for the primary links.',
    status: 'in_progress',
    assignee: 'u-ben',
  },
  {
    title: 'Write the new About page copy',
    description: '',
    status: 'in_progress',
    assignee: 'u-emma',
  },
  {
    title: 'Migrate blog posts to the new CMS',
    description:
      'Export the existing posts, clean up the markup and import them. Check that every redirect from the old URLs still resolves.',
    status: 'todo',
    assignee: 'u-dev',
  },
  {
    title: 'Create the component library',
    description:
      'Buttons, form fields, cards and modals with documented states. Reuse the design tokens from the style guide.',
    status: 'todo',
    assignee: 'u-ben',
  },
  {
    title: 'Set up analytics and consent banner',
    description: 'Privacy friendly analytics only. The consent banner should be short and clear.',
    status: 'todo',
    assignee: 'u-ana',
  },
  {
    title: 'Plan the launch announcement',
    description: '',
    status: 'todo',
    assignee: null,
  },
  {
    title: 'Run an accessibility review',
    description:
      'Test with a screen reader and keyboard only. Fix anything below WCAG AA before launch.',
    status: 'todo',
    assignee: null,
  },
  {
    title: 'Optimise images and page speed',
    description: 'Target a Lighthouse performance score of 90 or more on mobile.',
    status: 'in_progress',
    assignee: 'u-chloe',
  },
];

export interface SeedOptions {
  now: number;
  iterations: number;
  /** Reuse an existing secret (demo reset) so issued tokens stay valid. */
  secret?: string;
}

export async function createSeed({ now, iterations, secret }: SeedOptions): Promise<Db> {
  const users: DbUser[] = await Promise.all(
    DEMO_ACCOUNTS.map(async (a, i) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      avatarColor: a.avatarColor,
      createdAt: new Date(now - (DEMO_ACCOUNTS.length - i) * 86_400_000 * 7).toISOString(),
      ...(await hashPassword(DEMO_PASSWORD, iterations)),
    })),
  );

  const counters: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0 };
  const tasks: Task[] = SEED_TASKS.map((t, i) => {
    const created = new Date(now - (SEED_TASKS.length - i) * 3_600_000 * 5).toISOString();
    return {
      id: `t-seed-${String(i + 1).padStart(2, '0')}`,
      title: t.title,
      description: t.description,
      status: t.status,
      position: counters[t.status]++,
      assigneeId: t.assignee,
      createdBy: 'u-ana',
      createdAt: created,
      updatedAt: created,
    };
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    secret: secret ?? randomSecret(),
    users,
    board: { id: MAIN_BOARD_ID, name: 'Website relaunch' },
    tasks,
  };
}
