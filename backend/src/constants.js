// Judging criteria. Each category is scored 0–100; a judge's total for a project is the
// AVERAGE of the five categories (also out of 100).
export const SCORE_CRITERIA = [
  { key: 'presentation', label: 'Presentation', max: 100 },
  { key: 'execution', label: 'Execution', max: 100 },
  { key: 'innovation', label: 'Innovation', max: 100 },
  { key: 'impact', label: 'Impact', max: 100 },
  { key: 'implementation', label: 'Implementation', max: 100 },
];
export const SCORE_MAX_TOTAL = 100;

// Roles offered on the team-matching form, grouped into diversity buckets.
// A good team mixes buckets rather than stacking one of them.
export const ROLE_OPTIONS = [
  // Engineering
  { value: 'AI/ML Engineer', bucket: 'engineering' },
  { value: 'Machine Learning Researcher', bucket: 'engineering' },
  { value: 'Data Scientist', bucket: 'engineering' },
  { value: 'Data Engineer', bucket: 'engineering' },
  { value: 'Backend Engineer', bucket: 'engineering' },
  { value: 'Frontend Engineer', bucket: 'engineering' },
  { value: 'Full-Stack Engineer', bucket: 'engineering' },
  { value: 'Mobile Engineer', bucket: 'engineering' },
  { value: 'DevOps / Infrastructure Engineer', bucket: 'engineering' },
  { value: 'Security Engineer', bucket: 'engineering' },
  { value: 'Embedded / Hardware Engineer', bucket: 'engineering' },
  { value: 'Blockchain Engineer', bucket: 'engineering' },
  { value: 'QA / Test Engineer', bucket: 'engineering' },
  // Design
  { value: 'Product Designer', bucket: 'design' },
  { value: 'UX Designer', bucket: 'design' },
  { value: 'UI Designer', bucket: 'design' },
  { value: 'UX Researcher', bucket: 'design' },
  { value: 'Graphic / Visual Designer', bucket: 'design' },
  // Product & Strategy
  { value: 'Product Manager', bucket: 'product' },
  { value: 'Project Manager', bucket: 'product' },
  { value: 'Business / Strategy', bucket: 'product' },
  { value: 'Growth / Marketing', bucket: 'product' },
  { value: 'Sales / Partnerships', bucket: 'product' },
  // Domain & Other
  { value: 'Domain Expert', bucket: 'domain' },
  { value: 'Researcher (non-ML)', bucket: 'domain' },
  { value: 'Operations', bucket: 'domain' },
  { value: 'Content / Storytelling', bucket: 'domain' },
  { value: 'Student / Learner', bucket: 'domain' },
  { value: 'Other', bucket: 'domain' },
];

export function roleBucket(role) {
  const found = ROLE_OPTIONS.find((r) => r.value === role);
  return found ? found.bucket : 'domain';
}
