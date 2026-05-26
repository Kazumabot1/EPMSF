const normalize = (value?: string | null) => String(value ?? '').trim().toLowerCase();

export const getAppraisalScoreBandToneClass = (label?: string | null): string => {
  const normalized = normalize(label);
  if (normalized === 'outstanding') return 'appraisal-score-band-outstanding';
  if (normalized === 'exceeds requirements') return 'appraisal-score-band-exceeds';
  if (normalized === 'meet requirement' || normalized === 'meet requirements') return 'appraisal-score-band-meet';
  if (normalized === 'need improvement') return 'appraisal-score-band-improve';
  if (normalized === 'unsatisfactory') return 'appraisal-score-band-unsatisfactory';
  return '';
};
