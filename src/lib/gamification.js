export const TIERS = [
  {
    id: 'watchman',
    label: 'Watchman',
    description: 'Logged your first outage',
    requirement: 'Log once',
    color: '#8B95B0',
    glow: 'rgba(139,149,176,0.35)',
  },
  {
    id: 'observer',
    label: 'Observer',
    description: '3 days logged in a row',
    requirement: '3-day streak',
    color: '#F5A623',
    glow: 'rgba(245,166,35,0.35)',
  },
  {
    id: 'advocate',
    label: 'Advocate',
    description: '7 days logged in a row',
    requirement: '7-day streak',
    color: '#60A5FA',
    glow: 'rgba(96,165,250,0.35)',
  },
  {
    id: 'power_fighter',
    label: 'Power Fighter',
    description: 'Filed your first formal complaint',
    requirement: '1 complaint filed',
    color: '#E53935',
    glow: 'rgba(229,57,53,0.35)',
  },
  {
    id: 'all_seeing_eye',
    label: 'The All Seeing Eye',
    description: 'Filed 3 or more formal complaints',
    requirement: '3+ complaints filed',
    color: '#FFD700',
    glow: 'rgba(255,215,0,0.45)',
  },
];

export function getStreakData(outages = [], confirmations = []) {
  const loggedDates = new Set();
  outages.forEach(o => loggedDates.add(o.date));
  confirmations.forEach(c => loggedDates.add(c.date));

  const todayStr = new Date().toLocaleDateString('en-CA');

  let streak = 0;
  const checkDate = new Date();

  // Grace: if today not logged yet, start checking from yesterday
  if (!loggedDates.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 366; i++) {
    const ds = checkDate.toLocaleDateString('en-CA');
    if (loggedDates.has(ds)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { streak, todayLogged: loggedDates.has(todayStr) };
}

export function getBadgeStates(outages = [], complaintsCount = 0, streak = 0) {
  const hasFirstLog = outages.length > 0;
  return TIERS.map(tier => {
    let unlocked = false;
    switch (tier.id) {
      case 'watchman':       unlocked = hasFirstLog; break;
      case 'observer':       unlocked = streak >= 3; break;
      case 'advocate':       unlocked = streak >= 7; break;
      case 'power_fighter':  unlocked = complaintsCount >= 1; break;
      case 'all_seeing_eye': unlocked = complaintsCount >= 3; break;
    }
    return { ...tier, unlocked };
  });
}

export function getCurrentTier(outages = [], complaintsCount = 0, streak = 0) {
  const badges = getBadgeStates(outages, complaintsCount, streak);
  return [...badges].reverse().find(b => b.unlocked) || null;
}
