/**
 * Genetic Algorithm for Student Group Formation
 * Optimizes for:
 * 1. CGPA Balance (Low variance)
 * 2. Tier Balance (Mix of Excellent, Good, Low)
 * 3. Diversity (Gender and Department)
 */

interface Student {
  id: number;
  name: string;
  cgpa: number;
  tier: string;
  gender: string;
  department: string;
}

interface Group {
  members: Student[];
  avgCgpa: number;
  tierDistribution: { excellent: number; good: number; low: number };
  diversityScore: number;
}

export function runGeneticAlgorithm(students: Student[], groupSize: number = 4) {
  const populationSize = 100;
  const generations = 200;
  const numGroups = Math.floor(students.length / groupSize);

  // 1. Initialize Population
  let population = Array.from({ length: populationSize }, () => generateRandomChromosome(students, numGroups));

  for (let gen = 0; gen < generations; gen++) {
    // 2. Evaluate Fitness
    const fitnessScores = population.map(chromosome => calculateFitness(chromosome));

    // 3. Selection (Top 20%)
    const sortedIndices = fitnessScores
      .map((score, idx) => ({ score, idx }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.idx);

    const nextPopulation = sortedIndices.slice(0, Math.floor(populationSize * 0.2)).map(idx => population[idx]);

    // 4. Crossover & Mutation
    while (nextPopulation.length < populationSize) {
      const parentA = nextPopulation[Math.floor(Math.random() * nextPopulation.length)];
      const parentB = nextPopulation[Math.floor(Math.random() * nextPopulation.length)];
      
      let child = crossover(parentA, parentB);
      if (Math.random() < 0.1) {
        child = mutate(child);
      }
      nextPopulation.push(child);
    }

    population = nextPopulation;
  }

  // Return the best chromosome
  const bestChromosome = population[0];
  return bestChromosome.map((groupMembers, idx) => {
    const avgCgpa = groupMembers.reduce((sum, s) => sum + s.cgpa, 0) / groupMembers.length;
    const tierDistribution = {
      excellent: groupMembers.filter(s => s.tier === 'Excellent').length,
      good: groupMembers.filter(s => s.tier === 'Good').length,
      low: groupMembers.filter(s => s.tier === 'Low').length
    };
    return {
      groupNumber: idx + 1,
      members: groupMembers,
      avgCgpa,
      tierDistribution,
      fairnessScore: calculateGroupFitness(groupMembers)
    };
  });
}

function generateRandomChromosome(students: Student[], numGroups: number) {
  const shuffled = [...students].sort(() => Math.random() - 0.5);
  const groups: Student[][] = Array.from({ length: numGroups }, () => []);
  
  shuffled.forEach((student, idx) => {
    const groupIdx = idx % numGroups;
    groups[groupIdx].push(student);
  });
  
  return groups;
}

function calculateFitness(chromosome: Student[][]) {
  return chromosome.reduce((total, group) => total + calculateGroupFitness(group), 0) / chromosome.length;
}

function calculateGroupFitness(group: Student[]) {
  if (group.length === 0) return 0;

  // 1. CGPA Variance (Lower is better, so we use inverse)
  const avgCgpa = group.reduce((sum, s) => sum + s.cgpa, 0) / group.length;
  const variance = group.reduce((sum, s) => sum + Math.pow(s.cgpa - avgCgpa, 2), 0) / group.length;
  const cgpaScore = 1 / (variance + 0.1);

  // 2. Tier Balance
  const excellent = group.filter(s => s.tier === 'Excellent').length;
  const good = group.filter(s => s.tier === 'Good').length;
  const low = group.filter(s => s.tier === 'Low').length;
  
  let tierScore = 0;
  // Ideal: at least one of each
  if (excellent >= 1) tierScore += 15;
  else tierScore -= 10; // Penalty for no top students
  
  if (good >= 1) tierScore += 10;
  else tierScore -= 5;
  
  if (low >= 1) tierScore += 10;
  else tierScore -= 5;
  
  // Balance penalty: if a group is heavily skewed towards one tier
  const maxTierCount = Math.max(excellent, good, low);
  if (maxTierCount > group.length / 2) tierScore -= 20;

  // 3. Diversity (Gender & Dept)
  const genders = new Set(group.map(s => s.gender)).size;
  const depts = new Set(group.map(s => s.department)).size;
  const diversityScore = (genders * 5) + (depts * 5);

  return (cgpaScore * 10) + tierScore + diversityScore;
}

function crossover(parentA: Student[][], parentB: Student[][]) {
  // Simple crossover: take half groups from A and half from B, then fix duplicates
  const mid = Math.floor(parentA.length / 2);
  const child = [...parentA.slice(0, mid), ...parentB.slice(mid)];
  
  // Fix duplicates and missing students
  const allStudents = parentA.flat();
  const childStudents = child.flat();
  const seenIds = new Set();
  const duplicates: Student[] = [];
  
  child.forEach((group, gIdx) => {
    child[gIdx] = group.filter(s => {
      if (seenIds.has(s.id)) {
        return false;
      }
      seenIds.add(s.id);
      return true;
    });
  });

  const missing = allStudents.filter(s => !seenIds.has(s.id));
  missing.forEach(s => {
    // Add to the smallest group
    const smallestGroup = child.reduce((min, curr) => curr.length < min.length ? curr : min, child[0]);
    smallestGroup.push(s);
  });

  return child;
}

function mutate(chromosome: Student[][]) {
  // Swap two random students from different groups
  const g1Idx = Math.floor(Math.random() * chromosome.length);
  const g2Idx = Math.floor(Math.random() * chromosome.length);
  if (g1Idx === g2Idx || chromosome[g1Idx].length === 0 || chromosome[g2Idx].length === 0) return chromosome;

  const s1Idx = Math.floor(Math.random() * chromosome[g1Idx].length);
  const s2Idx = Math.floor(Math.random() * chromosome[g2Idx].length);

  const temp = chromosome[g1Idx][s1Idx];
  chromosome[g1Idx][s1Idx] = chromosome[g2Idx][s2Idx];
  chromosome[g2Idx][s2Idx] = temp;

  return chromosome;
}
