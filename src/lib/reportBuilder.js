import {
  BAND_CONFIG,
  DISCO_INFO,
  NERC_HQ,
  REGULATORY_TRIGGERS,
  buildOutageMap,
  getDaysInCurrentMonth,
  getLongestConsecutiveMissedStreak,
  getCurrentConsecutiveMissedStreak,
  isDayThresholdMet,
  parseLocalDate,
  formatDateLocal,
} from './calculations.js';

/**
 * Build the full complaint letter text.
 */
export function buildComplaintLetter({ profile, outages, recharges = [] }) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const band = profile.service_band || 'A';
  const disco = profile.disco || 'AEDC';
  const discoInfo = DISCO_INFO[disco] || DISCO_INFO['AEDC'];
  const config = BAND_CONFIG[band] || BAND_CONFIG['A'];

  const outageMap = buildOutageMap(outages);
  const monthDays = getDaysInCurrentMonth();

  const firstDate = outages.length > 0
    ? outages.reduce((min, o) => o.date < min ? o.date : min, outages[0].date)
    : formatDateLocal(today);
  const lastDate = outages.length > 0
    ? outages.reduce((max, o) => o.date > max ? o.date : max, outages[0].date)
    : formatDateLocal(today);

  const firstDateDisplay = parseLocalDate(firstDate).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const lastDateDisplay = parseLocalDate(lastDate).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Stats over the full period
  const allOutageMinutes = Object.values(outageMap).reduce((s, m) => s + m, 0);
  const totalOutageHours = (allOutageMinutes / 60).toFixed(1);
  const totalDays = Object.keys(outageMap).length || 1;
  const avgDailySupplyHours = ((24 * totalDays * 60 - allOutageMinutes) / 60 / totalDays);

  // Monthly stats
  let monthlyTotalOutageMins = 0;
  for (const d of monthDays) {
    monthlyTotalOutageMins += outageMap[d] || 0;
  }
  const monthlyAvgSupply = monthDays.length > 0
    ? (24 * 60 * monthDays.length - monthlyTotalOutageMins) / 60 / monthDays.length
    : 24;

  // Work out which band best matches actual average supply
  const BAND_ORDER = ['A', 'B', 'C', 'D', 'E'];
  const matchingBand = BAND_ORDER.find(b => avgDailySupplyHours >= (BAND_CONFIG[b]?.minHoursPerDay || 0)) || 'E';
  const lowerBand = BAND_ORDER[BAND_ORDER.indexOf(band) + 1] || band;
  const suggestedBand = matchingBand !== band ? matchingBand : lowerBand;
  const suggestedConfig = BAND_CONFIG[suggestedBand] || config;

  const currentStreak = getCurrentConsecutiveMissedStreak(outageMap, band);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const longestStreak = getLongestConsecutiveMissedStreak(outageMap, band, startOfMonth, today);
  const downgradeObligation = longestStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_DOWNGRADE;

  // Recharge summary
  let rechargeSummary = '';
  if (recharges.length > 0) {
    const totalSpend = recharges.reduce((s, r) => s + (parseFloat(r.amount_naira) || 0), 0);
    const totalKwh = recharges.reduce((s, r) => s + (parseFloat(r.kwh) || 0), 0);
    const avgCostPerKwh = totalKwh > 0 ? (totalSpend / totalKwh).toFixed(0) : null;
    rechargeSummary = `
My electricity spend for this period (from meter recharge records):
  Total recharges: ${recharges.length}
  Total amount paid: ₦${totalSpend.toLocaleString('en-NG', { minimumFractionDigits: 2 })}${totalKwh > 0 ? `\n  Total units bought: ${totalKwh.toFixed(1)} kWh` : ''}${avgCostPerKwh ? `\n  Average cost per unit: ₦${avgCostPerKwh}/kWh` : ''}

I am paying Band ${band} tariff rates, but receiving well below Band ${band} supply levels.
`;
  }

  const ccList = [`NERC Forum Office — ${discoInfo.nercForumOffice?.email || 'abujaforum@nerc.gov.ng'}`];
  if (downgradeObligation) {
    ccList.push(`NERC Headquarters — ${NERC_HQ.complaintsEmail}`);
  }

  const letter = `${dateStr}

Customer Care
${discoInfo.name}
${discoInfo.address || ''}

Dear Sir/Madam,

RE: Request to Adjust My Service Band — I am paying Band ${band} tariff but receiving Band ${suggestedBand}-level supply

I am writing to request a review of my electricity account and an adjustment to my service band, so that the tariff I pay reflects the electricity I am actually receiving.

MY DETAILS:
Name:           ${profile.full_name || '[Name not provided]'}
Address:        ${profile.address || '[Address not provided]'}${profile.area ? `\nArea:           ${profile.area}` : ''}
Meter Number:   ${profile.meter_number || 'N/A'}
Account Number: ${profile.account_number || 'N/A'}
Current Band:   Band ${band} (should supply at least ${config.minHoursPerDay} hours per day)
DisCo:          ${discoInfo.name}

WHAT I HAVE RECORDED (${firstDateDisplay} – ${lastDateDisplay}):
  Average daily supply I received: ${avgDailySupplyHours.toFixed(1)} hours/day
  Band ${band} minimum required:      ${config.minHoursPerDay} hours/day
  Total outage hours logged:       ${totalOutageHours} hours
  Longest consecutive days below Band ${band} minimum: ${longestStreak} day${longestStreak !== 1 ? 's' : ''}
${rechargeSummary}
WHY THIS MATTERS:
Under the NERC Service-Based Tariff (SBT) framework, customers are billed based on the band that matches their supply level. Band ${band} carries a higher tariff because it comes with a guaranteed minimum of ${config.minHoursPerDay} hours per day. I am not receiving that — my actual supply of ${avgDailySupplyHours.toFixed(1)} hours/day is closer to Band ${suggestedBand} (${suggestedConfig.minHoursPerDay} hours/day). That means I am paying more than I should be for the electricity I am getting.

The NERC Order on Migration of Customers and Compensation for Service Failure (May 2024) requires that customers whose supply consistently falls below their contracted band minimum be migrated to the appropriate band, and be compensated for past over-billing.

WHAT I AM ASKING FOR:

1. ADJUST MY SERVICE BAND: Please review my account and move me to Band ${suggestedBand}, which matches the supply I am actually receiving. This will bring my tariff in line with the electricity I get.

2. COMPENSATE ME FOR THE SHORTFALL: I have been charged Band ${band} rates while receiving Band ${suggestedBand}-level supply. I would like a credit on my account to cover the difference for the period documented above.

3. A CLEAR RESPONSE WITHIN 14 DAYS: Please let me know in writing what you will do — either restore my supply to the full Band ${band} minimum of ${config.minHoursPerDay} hours/day, or adjust my band and compensate me accordingly.

If I do not receive a satisfactory response within 14 days, I will escalate this matter to the NERC Forum Office and NERC Headquarters as provided under the NERC Customer Protection Regulations.

Thank you for your attention to this matter.

Yours sincerely,

${profile.full_name || '[Your Full Name]'}
${profile.address || ''}${profile.area ? `\n${profile.area}` : ''}

---
CC: ${ccList.join('\nCC: ')}
`;

  return letter;
}

/**
 * Convert recharge records to CSV content string.
 */
export function buildRechargeCSV(recharges) {
  const headers = ['Date', 'Amount (₦)', 'kWh', 'Cost/kWh (₦)', 'Token Number', 'Notes'];
  const rows = recharges.map(r => {
    const costPerKwh = r.kwh && r.amount_naira
      ? (parseFloat(r.amount_naira) / parseFloat(r.kwh)).toFixed(2)
      : '';
    return [
      r.recharge_date,
      r.amount_naira,
      r.kwh || '',
      costPerKwh,
      (r.token_number || '').replace(/,/g, ';'),
      (r.notes || '').replace(/,/g, ';').replace(/\n/g, ' '),
    ];
  });
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Convert outage records to CSV content string.
 */
export function buildCSV(outages) {
  const headers = ['Date', 'Start Time', 'End Time', 'Duration (hrs)', 'Notes'];
  const rows = outages.map(o => {
    const durationHrs = o.duration_minutes != null
      ? (o.duration_minutes / 60).toFixed(2)
      : o.is_active ? 'Active' : '';
    return [
      o.date,
      o.start_time,
      o.end_time || (o.is_active ? 'Active' : ''),
      durationHrs,
      (o.notes || '').replace(/,/g, ';').replace(/\n/g, ' '),
    ];
  });
  const allRows = [headers, ...rows];
  return allRows.map(r => r.join(',')).join('\n');
}

/**
 * Trigger a browser file download.
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
