import { ManpowerPositionRate, ManpowerProfile } from '../types';

export const DEFAULT_MANPOWER_RATES: ManpowerPositionRate[] = [
  {
    id: 'rate-foreman',
    role: 'Foreman',
    dailyRate: 1000,
    description: 'Site operations leader & workforce supervisor',
    isDefault: true,
  },
  {
    id: 'rate-installer',
    role: 'Installer',
    dailyRate: 850,
    description: 'Skilled technical installer & fabricator',
    isDefault: true,
  },
  {
    id: 'rate-labor',
    role: 'Labor',
    dailyRate: 600,
    description: 'General construction and site support workforce',
    isDefault: true,
  },
  {
    id: 'rate-engineer',
    role: 'Engineer',
    dailyRate: 1800,
    description: 'Project Engineer / Quality & Structural Lead',
    isDefault: true,
  },
  {
    id: 'rate-architect',
    role: 'Architect',
    dailyRate: 2000,
    description: 'Design architect & site inspection lead',
    isDefault: true,
  },
  {
    id: 'rate-safety',
    role: 'Safety Officer',
    dailyRate: 1200,
    description: 'Site safety and compliance officer (DOLE/OSHC)',
    isDefault: true,
  },
  {
    id: 'rate-driver',
    role: 'Driver / Logistics',
    dailyRate: 750,
    description: 'Vehicle operator & logistics delivery support',
    isDefault: true,
  },
];

export const INITIAL_MANPOWER_PROFILES: ManpowerProfile[] = [];
