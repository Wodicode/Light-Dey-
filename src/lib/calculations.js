export const BAND_CONFIG = {
  A: { minHoursPerDay: 20, label: 'Band A', compensationThreshold: 0.90 },
  B: { minHoursPerDay: 16, label: 'Band B', compensationThreshold: 0.90 },
  C: { minHoursPerDay: 12, label: 'Band C', compensationThreshold: 0.90 },
  D: { minHoursPerDay: 8,  label: 'Band D', compensationThreshold: 0.90 },
  E: { minHoursPerDay: 4,  label: 'Band E', compensationThreshold: 0.90 },
};

export const REGULATORY_TRIGGERS = {
  CONSECUTIVE_DAYS_PUBLISH: 2,
  CONSECUTIVE_DAYS_DOWNGRADE: 7,
};

export const DISCO_INFO = {
  AEDC: {
    name: 'Abuja Electricity Distribution Plc (AEDC)',
    phone: '08039070070',
    whatsapp: ['08152141414', '08152151515'],
    email: 'customercare@abujaelectricity.com',
    complaintPortal: 'https://complaint.abujaelectricity.com',
    address: 'Plot 1137, Tigris Crescent, Maitama, Abuja',
    nercForumOffice: {
      address: 'No.14, Road 131, Gwarinpa, Abuja',
      phone: '0814-686-2225',
      email: 'abujaforum@nerc.gov.ng',
    },
  },
  EKEDC: {
    name: 'Eko Electricity Distribution Company (EKEDC)',
    phone: '01-2950000',
    email: 'customercare@ekedp.com',
    complaintPortal: 'https://www.ekedp.com',
    nercForumOffice: { email: 'lagosforum@nerc.gov.ng' },
  },
  IE: {
    name: 'Ikeja Electric (IE)',
    phone: '01-4545454',
    email: 'customercare@ikejaelectric.com',
    complaintPortal: 'https://www.ikejaelectric.com',
    nercForumOffice: { email: 'lagosforum@nerc.gov.ng' },
  },
  PHED: {
    name: 'Port Harcourt Electricity Distribution (PHED)',
    phone: '08039070072',
    email: 'customercare@phed.com.ng',
    complaintPortal: 'https://www.phed.com.ng',
    nercForumOffice: { email: 'phforum@nerc.gov.ng' },
  },
  EEDC: {
    name: 'Enugu Electricity Distribution Company (EEDC)',
    phone: '042-453271',
    email: 'customercare@enugudisco.com',
    complaintPortal: 'https://www.enugudisco.com',
    nercForumOffice: { email: 'enuguforum@nerc.gov.ng' },
  },
  IBEDC: {
    name: 'Ibadan Electricity Distribution Company (IBEDC)',
    phone: '08028270186',
    email: 'customercare@ibedc.com',
    complaintPortal: 'https://www.ibedc.com',
    nercForumOffice: { email: 'ibadanforum@nerc.gov.ng' },
  },
};

export const NERC_HQ = {
  complaintsEmail: 'complaints@nerc.gov.ng',
  phone: ['09-462-1414', '09-462-1424'],
  address: 'Plot 1387, Cadastral Zone A00, Central Business District, Abuja',
};

/**
 * Parse a date string "YYYY-MM-DD" into a local Date at midnight.
 */
export function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format a Date to "YYYY-MM-DD" in local time.
 */
export function formatDateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get today's date string "YYYY-MM-DD" in local time.
 */
export function todayStr() {
  return formatDateLocal(new Date());
}

/**
 * Convert HH:MM time string to minutes since midnight.
 */
export function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert minutes since midnight to "HH:MM" string.
 */
export function minutesToTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Split an outage record that might span midnight into per-day chunks.
 * Returns array of { dateStr, outageMinutes }.
 *
 * If endTime is null (active outage), uses current time as the end.
 */
export function splitOutageAcrossDays(outage, activeMinutesOverride = null) {
  const dateStr = outage.date;
  const startMins = timeToMinutes(outage.start_time);

  let endMins;
  if (outage.is_active) {
    if (activeMinutesOverride !== null) {
      endMins = activeMinutesOverride;
    } else {
      const now = new Date();
      const todayDate = formatDateLocal(now);
      if (todayDate === dateStr) {
        endMins = now.getHours() * 60 + now.getMinutes();
      } else {
        // Outage started on a previous day and is still active — end at current minute of today
        endMins = 24 * 60;
      }
    }
  } else if (outage.end_time) {
    endMins = timeToMinutes(outage.end_time);
  } else {
    return [];
  }

  const result = [];
  const startDate = parseLocalDate(dateStr);

  if (endMins <= startMins && !outage.is_active) {
    // End is on the next day
    const minsOnStartDay = 24 * 60 - startMins;
    if (minsOnStartDay > 0) {
      result.push({ dateStr, outageMinutes: minsOnStartDay });
    }
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = formatDateLocal(nextDate);
    if (endMins > 0) {
      result.push({ dateStr: nextDateStr, outageMinutes: endMins });
    }
  } else if (outage.is_active) {
    const now = new Date();
    const todayDate = formatDateLocal(now);
    if (dateStr === todayDate) {
      const nowMins = now.getHours() * 60 + now.getMinutes();
      result.push({ dateStr, outageMinutes: nowMins - startMins });
    } else {
      // Spans multiple days — add from start to midnight of start day
      const minsOnStartDay = 24 * 60 - startMins;
      if (minsOnStartDay > 0) {
        result.push({ dateStr, outageMinutes: minsOnStartDay });
      }
      // Add full days in between
      let cursor = new Date(startDate);
      cursor.setDate(cursor.getDate() + 1);
      while (formatDateLocal(cursor) !== todayDate) {
        result.push({ dateStr: formatDateLocal(cursor), outageMinutes: 24 * 60 });
        cursor.setDate(cursor.getDate() + 1);
      }
      // Add partial today
      const nowMins = now.getHours() * 60 + now.getMinutes();
      if (nowMins > 0) {
        result.push({ dateStr: todayDate, outageMinutes: nowMins });
      }
    }
  } else {
    result.push({ dateStr, outageMinutes: endMins - startMins });
  }

  return result.filter(r => r.outageMinutes > 0);
}

/**
 * Compute a map of dateStr -> outageMinutes from a list of outage records.
 * Active outages are counted up to now.
 */
export function buildOutageMap(outages) {
  const map = {};
  for (const outage of outages) {
    const chunks = splitOutageAcrossDays(outage);
    for (const { dateStr, outageMinutes } of chunks) {
      map[dateStr] = (map[dateStr] || 0) + outageMinutes;
    }
  }
  return map;
}

/**
 * Given a band and outageMinutes for a day, determine if supply threshold was met.
 */
export function isDayThresholdMet(band, outageMinutes) {
  const config = BAND_CONFIG[band] || BAND_CONFIG['A'];
  const supplyMinutes = 24 * 60 - outageMinutes;
  return supplyMinutes >= config.minHoursPerDay * 60;
}

/**
 * Calculate consecutive streak of days threshold was missed ending today.
 */
export function getCurrentConsecutiveMissedStreak(outageMap, band) {
  const today = new Date();
  let streak = 0;
  let cursor = new Date(today);
  for (let i = 0; i < 90; i++) {
    const dateStr = formatDateLocal(cursor);
    const outageMinutes = outageMap[dateStr] || 0;
    if (!isDayThresholdMet(band, outageMinutes)) {
      streak++;
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Calculate the longest consecutive missed streak within a given date range.
 */
export function getLongestConsecutiveMissedStreak(outageMap, band, startDate, endDate) {
  let longest = 0;
  let current = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dateStr = formatDateLocal(cursor);
    const outageMinutes = outageMap[dateStr] || 0;
    if (!isDayThresholdMet(band, outageMinutes)) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return longest;
}

/**
 * Get all days in the current calendar month up to today.
 */
export function getDaysInCurrentMonth() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const days = [];
  for (let d = 1; d <= today.getDate(); d++) {
    days.push(formatDateLocal(new Date(year, month, d)));
  }
  return days;
}

/**
 * Get all days in the last 30 days including today.
 */
export function getLast30Days() {
  const days = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(formatDateLocal(d));
  }
  return days;
}

/**
 * Format duration minutes as "Xh Ym".
 */
export function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format a live elapsed seconds value as "X hrs Y mins Z secs".
 */
export function formatElapsedSeconds(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h} hr${h !== 1 ? 's' : ''}`);
  parts.push(`${m} min${m !== 1 ? 's' : ''}`);
  parts.push(`${s} sec${s !== 1 ? 's' : ''}`);
  return parts.join(' ');
}

/**
 * Get supply hours for today accounting for any live active outage.
 */
export function getTodaySupplyHours(outageMap) {
  const dateStr = todayStr();
  const outageMinutes = outageMap[dateStr] || 0;
  return (24 * 60 - outageMinutes) / 60;
}

/**
 * Get monthly stats for the current month.
 */
export function getMonthlyStats(outageMap, band) {
  const days = getDaysInCurrentMonth();
  const config = BAND_CONFIG[band] || BAND_CONFIG['A'];
  let totalOutageMinutes = 0;
  let daysMetThreshold = 0;
  let daysMissedThreshold = 0;

  const dailySupplyHours = days.map(dateStr => {
    const outageMinutes = outageMap[dateStr] || 0;
    const supplyHours = (24 * 60 - outageMinutes) / 60;
    totalOutageMinutes += outageMinutes;
    if (isDayThresholdMet(band, outageMinutes)) {
      daysMetThreshold++;
    } else {
      daysMissedThreshold++;
    }
    return { dateStr, supplyHours, outageMinutes };
  });

  const avgDailySupplyHours = days.length > 0
    ? dailySupplyHours.reduce((sum, d) => sum + d.supplyHours, 0) / days.length
    : 0;

  const thresholdRequired = config.minHoursPerDay * config.compensationThreshold;
  const compensationEligible = avgDailySupplyHours < thresholdRequired;

  return {
    days: dailySupplyHours,
    totalOutageHours: totalOutageMinutes / 60,
    avgDailySupplyHours,
    daysMetThreshold,
    daysMissedThreshold,
    compensationEligible,
    thresholdRequired,
    minHoursPerDay: config.minHoursPerDay,
  };
}
