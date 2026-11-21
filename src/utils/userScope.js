export const DEFAULT_SECTORS = [
  {
    id: 'sector_west_cairo',
    name: 'قطاع غرب القاهرة',
    branchIds: ['branch_maadi', 'branch_october1', 'branch_october2']
  },
  {
    id: 'sector_east_cairo',
    name: 'قطاع شرق القاهرة',
    branchIds: ['branch_nakheel', 'branch_lotus']
  },
  {
    id: 'sector_east_delta',
    name: 'قطاع شرق الدلتا',
    branchIds: ['branch_sheraton', 'branch_damietta', 'branch_mansoura']
  },
  {
    id: 'sector_alex_tanta',
    name: 'قطاع اسكندرية وطنطا',
    branchIds: ['branch_alexandria', 'branch_tanta']
  },
  {
    id: 'sector_upper_egypt',
    name: 'قطاع الصعيد',
    branchIds: ['branch_minya', 'branch_assiut']
  }
];

export function getUserAllowedBranches(currentUser, allBranches = []) {
  if (!currentUser) return [];

  // 1. Executive Director & HE WHO REMAINS sees all branches across all sectors
  if (currentUser.titleCode === 'memberships_executive_director' || currentUser.titleCode === 'he_who_remains' || currentUser.isSuperAdmin) {
    return allBranches;
  }

  // 2. Area Manager sees only branches in their sector
  if (currentUser.titleCode === 'memberships_area_manager') {
    let sector = DEFAULT_SECTORS.find(s => s.id === currentUser.sectorId);
    if (!sector) {
      // Find sector by branchId
      sector = DEFAULT_SECTORS.find(s => s.branchIds.includes(currentUser.branchId));
    }
    if (sector) {
      return allBranches.filter(b => sector.branchIds.includes(b.id));
    }
  }

  // 3. All other positions: Manager, Deputy Manager, Specialists see only their assigned branch
  return allBranches.filter(b => b.id === currentUser.branchId);
}

export function getUserAllowedBranchIds(currentUser, allBranches = []) {
  const allowed = getUserAllowedBranches(currentUser, allBranches);
  return allowed.map(b => b.id);
}
