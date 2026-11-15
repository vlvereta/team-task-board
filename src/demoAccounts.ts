// Static demo-account details. Shared by the seed (mock server) and the login
// page's one-click sign-in list. Contains no domain data.

export const DEMO_PASSWORD = 'demo1234';

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'u-ana',
    name: 'Ana Silva',
    email: 'ana@crewboard.demo',
    avatarColor: '#0f766e',
    role: 'Project lead',
  },
  {
    id: 'u-ben',
    name: 'Ben Okafor',
    email: 'ben@crewboard.demo',
    avatarColor: '#7c3aed',
    role: 'Developer',
  },
  {
    id: 'u-chloe',
    name: 'Chloé Martin',
    email: 'chloe@crewboard.demo',
    avatarColor: '#c2410c',
    role: 'Designer',
  },
  {
    id: 'u-dev',
    name: 'Dev Patel',
    email: 'dev@crewboard.demo',
    avatarColor: '#1d4ed8',
    role: 'Developer',
  },
  {
    id: 'u-emma',
    name: 'Emma Novak',
    email: 'emma@crewboard.demo',
    avatarColor: '#be185d',
    role: 'Content',
  },
];

/** Avatar colours for newly registered users; all pass AA with white text. */
export const AVATAR_PALETTE = [
  '#0f766e',
  '#7c3aed',
  '#c2410c',
  '#1d4ed8',
  '#be185d',
  '#4d7c0f',
  '#b45309',
  '#0369a1',
];
