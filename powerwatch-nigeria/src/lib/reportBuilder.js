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
export function buildComplaintLetter({ profile, outages }) {
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

  // Calculate stats over the full period
  const allOutageMinutes = Object.values(outageMap).reduce((s, m) => s + m, 0);
  const totalOutageHours = (allOutageMinutes / 60).toFixed(1);
  const totalDays = Object.keys(outageMap).length || 1;
  const avgDailySupplyHours = ((24 * totalDays * 60 - allOutageMinutes) / 60 / totalDays).toFixed(1);

  // Monthly stats
  let monthlyTotalOutageMins = 0;
  for (const d of monthDays) {
    monthlyTotalOutageMins += outageMap[d] || 0;
  }
  const monthlyAvgSupply = monthDays.length > 0
    ? (24 * 60 * monthDays.length - monthlyTotalOutageMins) / 60 / monthDays.length
    : 24;

  const compensationThresholdHours = config.minHoursPerDay * config.compensationThreshold;
  const compensationEligible = monthlyAvgSupply < compensationThresholdHours;

  // Consecutive streak
  const currentStreak = getCurrentConsecutiveMissedStreak(outageMap, band);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const longestStreak = getLongestConsecutiveMissedStreak(outageMap, band, startOfMonth, today);

  const publishObligation = longestStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_PUBLISH;
  const downgradeObligation = longestStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_DOWNGRADE;

  // CC list
  const ccList = [`NERC Abuja Forum Office — ${discoInfo.nercForumOffice?.email || 'abujaforum@nerc.gov.ng'}`];
  if (downgradeObligation) {
    ccList.push(`NERC Headquarters — ${NERC_HQ.complaintsEmail}`);
  }

  // Breaches section
  const breaches = [];
  if (compensationEligible) {
    breaches.push(
      `• COMPENSATION OBLIGATION: My average daily supply of ${monthlyAvgSupply.toFixed(1)} hours ` +
      `falls below the ${compensationThresholdHours}-hour compensation threshold (90% of Band ${band}'s ` +
      `${config.minHoursPerDay}-hour minimum). Under the NERC Order on Migration of Customers and ` +
      `Compensation for Service Failure (May 2024), I am entitled to a service credit or financial ` +
      `compensation for each day of service failure.`
    );
  }
  if (publishObligation && longestStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_PUBLISH) {
    breaches.push(
      `• PUBLICATION OBLIGATION: Supply has fallen below the Band ${band} threshold for ${longestStreak} ` +
      `consecutive days this period. Under NERC regulations, ${discoInfo.name} is obligated to publish ` +
      `an official explanation on its website by 10:00 AM the following day after 2 consecutive days ` +
      `of failure.`
    );
  }
  if (downgradeObligation) {
    breaches.push(
      `• MANDATORY DOWNGRADE: The above-referenced consecutive failure of ${longestStreak} days exceeds ` +
      `the 7-day threshold stipulated under NERC's Service-Based Tariff framework. This feeder/network ` +
      `segment is mandated for automatic downgrade to the next lower service band until service is ` +
      `demonstrably restored to required levels.`
    );
  }

  const breachText = breaches.length > 0
    ? `REGULATORY THRESHOLD BREACHES IDENTIFIED:\n\n${breaches.join('\n\n')}`
    : `While I have not yet triggered the maximum regulatory thresholds, the consistent failure to ` +
      `deliver the contracted Band ${band} minimum of ${config.minHoursPerDay} hours per day constitutes ` +
      `a material breach of the service-based tariff agreement.`;

  const letter = `${dateStr}

The Customer Care Manager
${discoInfo.name}
${discoInfo.address || ''}

Dear Sir/Madam,

RE: FORMAL COMPLAINT — PERSISTENT ELECTRICITY SUPPLY FAILURE BELOW NERC SERVICE-BASED TARIFF (SBT) BAND ${band} MINIMUM

I write to formally register my complaint regarding the chronic and persistent failure to supply electricity in accordance with the Nigerian Electricity Regulatory Commission (NERC) Service-Based Tariff (SBT) framework under which I am billed.

CUSTOMER DETAILS:
Full Name:      ${profile.full_name || '[Name not provided]'}
Address:        ${profile.address || '[Address not provided]'}
Area:           ${profile.area || '[Area not provided]'}
Meter Number:   ${profile.meter_number || 'N/A'}
Account Number: ${profile.account_number || 'N/A'}
Service Band:   Band ${band} (Minimum: ${config.minHoursPerDay} hours supply per day)
DisCo:          ${discoInfo.name}

REPORTING PERIOD:
${firstDateDisplay} to ${lastDateDisplay}

OUTAGE SUMMARY:
Total outage hours recorded:  ${totalOutageHours} hours
Average daily supply:         ${avgDailySupplyHours} hours/day
Required minimum (Band ${band}): ${config.minHoursPerDay} hours/day
Current consecutive missed-days streak: ${currentStreak} day${currentStreak !== 1 ? 's' : ''}
Longest consecutive streak (this month): ${longestStreak} day${longestStreak !== 1 ? 's' : ''}

${breachText}

REGULATORY BASIS FOR THIS COMPLAINT:
This complaint is filed pursuant to the following NERC instruments:

1. NERC Service-Based Tariff (SBT) Order (November 2020) — which established minimum supply hours by band and linked tariff rates to service delivery obligations.

2. NERC Order on Migration of Customers and Compensation for Service Failure (May 2024) — which mandates automatic compensation or service credits when supply falls below 90% of the contracted band minimum, and requires publication of explanations after 2 consecutive days of failure.

3. NERC April 2024 Supplementary Order to MYTO 2024 — which reinforces the obligation of DisCos to meet Band-specific supply commitments as a condition of the multi-year tariff order.

DEMANDS:
In light of the foregoing, I hereby demand the following from your organisation:

1. COMPENSATION: Immediate calculation and issuance of service credits or financial compensation for all days on which supply fell below the Band ${band} minimum threshold.

2. WRITTEN RESPONSE: A formal written response to this complaint within fourteen (14) calendar days of receipt, as required under the NERC Customer Protection Regulations.

3. CORRECTIVE ACTION PLAN: A documented corrective action plan detailing the specific steps your organisation will take to restore and maintain the contracted Band ${band} supply hours at my location.

4. COMPLIANCE CONFIRMATION: Written confirmation of compliance with the publication obligations stipulated in the NERC May 2024 Order for all consecutive failure periods identified above.

I reserve the right to escalate this matter to the NERC Forum Office and NERC Headquarters if a satisfactory response is not received within the stipulated timeframe.

Yours faithfully,

${profile.full_name || '[Your Full Name]'}
${profile.address || ''}
${profile.area || ''}

---
CC: ${ccList.join('\nCC: ')}
`;

  return letter;
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
