import { Project, ProjectMilestone, WindowDoorItem } from '../types';

export const DEFAULT_PROJECT_MILESTONES: Omit<ProjectMilestone, 'completed'>[] = [
  {
    id: 1,
    no: 1,
    activity: 'Site Evaluation & Initial Site Measurement',
    weight: 5,
  },
  {
    id: 2,
    no: 2,
    activity: 'Shop Drawing Preparation',
    weight: 10,
  },
  {
    id: 3,
    no: 3,
    activity: 'Shop Drawing Submission & Approval',
    weight: 10,
  },
  {
    id: 4,
    no: 4,
    activity: 'Material / Glass / Hardware Submittal Approval',
    weight: 5,
  },
  {
    id: 5,
    no: 5,
    activity: 'Final Site Verification / As-Built Checking Before Fabrication',
    weight: 5,
  },
  {
    id: 6,
    no: 6,
    activity: 'Fabrication / Production',
    weight: 15,
  },
  {
    id: 7,
    no: 7,
    activity: 'Gate Pass Processing & Temporary Storage Preparation',
    weight: 5,
  },
  {
    id: 8,
    no: 8,
    activity: 'Delivery & Hauling to Site',
    weight: 5,
  },
  {
    id: 9,
    no: 9,
    activity: 'Installation of Windows & Doors',
    weight: 25,
  },
  {
    id: 10,
    no: 10,
    activity: 'Flood Test / Drainage Test',
    weight: 2,
  },
  {
    id: 11,
    no: 11,
    activity: 'Water / Hose Test',
    weight: 3,
  },
  {
    id: 12,
    no: 12,
    activity: 'Protection Application & Cleaning',
    weight: 5,
  },
  {
    id: 13,
    no: 13,
    activity: 'Final Inspection / Punch Listing & Rectification',
    weight: 3,
  },
  {
    id: 14,
    no: 14,
    activity: 'Handover / Turnover & Documentation',
    weight: 2,
  },
];

/**
 * Initializes a project checklist with the default 14 milestones
 */
export function getInitialProjectChecklist(existing?: ProjectMilestone[]): ProjectMilestone[] {
  if (existing && existing.length === DEFAULT_PROJECT_MILESTONES.length) {
    return existing;
  }

  return DEFAULT_PROJECT_MILESTONES.map((item) => {
    const found = existing?.find((e) => e.no === item.no || e.id === item.id);
    return {
      id: item.id,
      no: item.no,
      activity: item.activity,
      weight: item.weight,
      completed: found ? found.completed : false,
      completedDate: found?.completedDate,
      remarks: found?.remarks || '',
    };
  });
}

export interface ProjectProgressStats {
  percentage: number; // 0 to 100
  completedMilestonesCount: number;
  totalMilestonesCount: number;
  installationWeightContribution: number; // 0 to 25
  installationProgressPercent: number; // 0 to 100% of installation
  totalWindowsDoorsUnits: number;
  installedWindowsDoorsUnits: number;
  milestoneScores: { no: number; activity: string; weight: number; earned: number; completed: boolean }[];
}

/**
 * Calculates accurate project % completion based on the 14-item milestone checklist
 * and dynamic Windows/Doors installation schedule for Milestone #9.
 */
export function calculateProjectProgress(project: Project): ProjectProgressStats {
  const checklist = getInitialProjectChecklist(project.checklist);
  const windowsDoors = project.windowsDoors || [];

  // Calculate Windows & Doors stats
  let totalUnits = 0;
  let installedUnits = 0;

  windowsDoors.forEach((wd) => {
    const q = Number(wd.qty) || 1;
    totalUnits += q;
    if (wd.isInstalled) {
      installedUnits += wd.installedQty !== undefined ? Number(wd.installedQty) : q;
    } else if (wd.installedQty && wd.installedQty > 0) {
      installedUnits += Number(wd.installedQty);
    }
  });

  // Calculate Installation (Milestone #9) completion
  let installationProgressPercent = 0;
  let installationEarned = 0;

  const milestone9 = checklist.find((m) => m.no === 9);
  const m9Weight = milestone9?.weight || 25;

  if (windowsDoors.length > 0 && totalUnits > 0) {
    installationProgressPercent = Math.min(100, Math.max(0, (installedUnits / totalUnits) * 100));
    installationEarned = (installationProgressPercent / 100) * m9Weight;
  } else {
    // If no specific windows/doors schedule entered, use manual checkbox
    const isM9Done = milestone9?.completed || false;
    installationProgressPercent = isM9Done ? 100 : 0;
    installationEarned = isM9Done ? m9Weight : 0;
  }

  let totalEarned = 0;
  let completedCount = 0;

  const milestoneScores = checklist.map((m) => {
    let earned = 0;
    let isDone = m.completed;

    if (m.no === 9) {
      earned = installationEarned;
      isDone = windowsDoors.length > 0 && totalUnits > 0 ? installedUnits >= totalUnits : m.completed;
    } else {
      earned = m.completed ? m.weight : 0;
    }

    if (isDone) completedCount++;
    totalEarned += earned;

    return {
      no: m.no,
      activity: m.activity,
      weight: m.weight,
      earned: Number(earned.toFixed(1)),
      completed: isDone,
    };
  });

  const finalPercent = Math.min(100, Math.max(0, Math.round(totalEarned * 10) / 10));

  return {
    percentage: finalPercent,
    completedMilestonesCount: completedCount,
    totalMilestonesCount: checklist.length,
    installationWeightContribution: Number(installationEarned.toFixed(1)),
    installationProgressPercent: Math.round(installationProgressPercent),
    totalWindowsDoorsUnits: totalUnits,
    installedWindowsDoorsUnits: installedUnits,
    milestoneScores,
  };
}
