export const THRESHOLDS = {
  // resume similarity
  resumeSimilarity: 0.6, // Jaccard similarity of 5-word shingles
  resumeMinChars: 300, // skip very short texts
  shingleSize: 5,
  maxShinglePostings: 50, // ignore phrases shared by more resumes than this (templates/boilerplate)

  // GitHub padding signals
  highForkRatio: 0.7,
  highForkMinRepos: 5,
  emptyRepoRatio: 0.5,
  emptyRepoMinRepos: 4,
  newAccountDays: 60,
  burstMaxActiveMonths: 1,
  burstMinContributions: 100,
  highForkMaxOriginals: 10, // only flag high fork ratios when few original repos back them
  // resume stuffing
  longSkillList: 40,
};
