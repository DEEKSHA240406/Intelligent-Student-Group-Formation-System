import random
from math import log2
from typing import Any, Dict, List, Optional, Tuple

Student = Dict[str, Any]


def calculate_group_fitness(group_members: List[Student]) -> float:
    if not group_members:
        return 0.0

    # CGPA balance: reward small within-group variance
    cgpas = [float(m.get("cgpa") or 0) for m in group_members]
    mean_cgpa = sum(cgpas) / len(cgpas)
    variance = sum((x - mean_cgpa) ** 2 for x in cgpas) / len(cgpas)
    cgpa_score = 1.0 / (variance + 0.1)

    # Tier balance
    counts = {"Excellent": 0, "Good": 0, "Low": 0}
    for m in group_members:
        tier = m.get("tier")
        if tier in counts:
            counts[tier] += 1
    tier_presence_score = sum(1.0 for c in counts.values() if c > 0) / 3.0
    distribution = max(counts.values()) / max(1, len(group_members))
    tier_dominance_penalty = max(0.0, distribution - 0.4) * 2.0

    # Diversity
    gender_set = set((m.get("gender") or "Unknown") for m in group_members)
    dept_set = set((m.get("department") or "Unknown") for m in group_members)

    def entropy(values: List[str]) -> float:
        if not values:
            return 0.0
        freq = {}
        for val in values:
            freq[val] = freq.get(val, 0) + 1
        total = len(values)
        ent = 0.0
        for count in freq.values():
            p = count / total
            ent -= p * log2(p)
        if len(freq) <= 1:
            return 0.0
        return ent / log2(len(freq))

    gender_entropy = entropy([m.get("gender") or "Unknown" for m in group_members])
    dept_entropy = entropy([m.get("department") or "Unknown" for m in group_members])

    diversity_score = (gender_entropy + dept_entropy) * 5.0

    # Combined score
    score = cgpa_score * 10.0 + tier_presence_score * 20.0 - tier_dominance_penalty * 20.0 + diversity_score

    return score


def _build_group_metrics(group_members: List[Student]) -> Dict[str, Any]:
    if not group_members:
        return {
            "cgpaAverage": 0.0,
            "cgpaVariance": 0.0,
            "tierCounts": {"Excellent": 0, "Good": 0, "Low": 0},
            "departmentCount": 0,
            "genderCount": 0,
            "fitness": 0.0,
        }

    cgpas = [float(m.get("cgpa") or 0) for m in group_members]
    avg = sum(cgpas) / len(cgpas)
    variance = sum((x - avg) ** 2 for x in cgpas) / len(cgpas)

    tier_counts = {"Excellent": 0, "Good": 0, "Low": 0}
    for m in group_members:
        tier = m.get("tier")
        if tier in tier_counts:
            tier_counts[tier] += 1

    return {
        "cgpaAverage": avg,
        "cgpaVariance": variance,
        "tierCounts": tier_counts,
        "departmentCount": len(set((m.get("department") or "Unknown") for m in group_members)),
        "genderCount": len(set((m.get("gender") or "Unknown") for m in group_members)),
        "fitness": calculate_group_fitness(group_members),
    }


def _chromosome_fitness(chromosome: List[List[int]], students_data: List[Student], target_sizes: List[int]) -> float:
    total_score = 0.0
    group_scores = []
    size_penalty = 0.0

    for idx, group_ids in enumerate(chromosome):
        members = [students_data[i] for i in group_ids]
        score = calculate_group_fitness(members)
        group_scores.append(score)
        total_score += score
        size_diff = abs(len(group_ids) - target_sizes[idx])
        size_penalty -= size_diff * 8.0

    # global CGPA mean consistency
    means = []
    for group_ids in chromosome:
        members = [students_data[i] for i in group_ids] if group_ids else []
        if members:
            cgpas = [float(m.get("cgpa") or 0) for m in members]
            means.append(sum(cgpas) / len(cgpas))
    if len(means) > 1:
        mean_of_means = sum(means) / len(means)
        mean_var = sum((x - mean_of_means) ** 2 for x in means) / len(means)
        total_score += 40.0 / (mean_var + 1.0)

    return total_score + size_penalty


def _make_random_chromosome(num_students: int, target_sizes: List[int]) -> List[List[int]]:
    ids = list(range(num_students))
    random.shuffle(ids)
    chromosome = []
    index = 0
    for size in target_sizes:
        chromosome.append(ids[index : index + size])
        index += size
    return chromosome


def _crossover(parent1: List[List[int]], parent2: List[List[int]], target_sizes: List[int]) -> List[List[int]]:
    num_groups = len(target_sizes)
    chosen = set(random.sample(range(num_groups), k=max(1, num_groups // 2)))
    child: List[List[int]] = [list(parent1[g]) if g in chosen else [] for g in range(num_groups)]
    assigned = set(i for g in chosen for i in parent1[g])

    remaining = [i for g in parent2 for i in g if i not in assigned]

    for g in range(num_groups):
        if g in chosen:
            continue
        size = target_sizes[g]
        child[g] = remaining[:size]
        assigned.update(child[g])
        remaining = remaining[size:]

    # fill any leftover entries
    if remaining:
        for g in range(num_groups):
            while len(child[g]) < target_sizes[g] and remaining:
                child[g].append(remaining.pop(0))

    return child


def _mutate(chromosome: List[List[int]], mutation_rate: float = 0.25) -> None:
    if random.random() >= mutation_rate:
        return
    num_groups = len(chromosome)
    if num_groups < 2:
        return
    g1, g2 = random.sample(range(num_groups), 2)
    if not chromosome[g1] or not chromosome[g2]:
        return
    i1 = random.randrange(len(chromosome[g1]))
    i2 = random.randrange(len(chromosome[g2]))
    chromosome[g1][i1], chromosome[g2][i2] = chromosome[g2][i2], chromosome[g1][i1]


def random_grouping(students_data: List[Student], group_size: int) -> List[List[Student]]:
    if not students_data or group_size <= 0:
        return []
    shuffled = students_data[:]
    random.shuffle(shuffled)
    num_groups = max(1, (len(shuffled) + group_size - 1) // group_size)
    groups = [[] for _ in range(num_groups)]
    for idx, student in enumerate(shuffled):
        groups[idx % num_groups].append(student)
    return groups


def round_robin_grouping(students_data: List[Student], group_size: int) -> List[List[Student]]:
    if not students_data or group_size <= 0:
        return []
    shuffled = students_data[:]  # preserve order but could be randomized as desired
    random.shuffle(shuffled)
    num_groups = max(1, (len(shuffled) + group_size - 1) // group_size)
    groups = [[] for _ in range(num_groups)]
    for idx, student in enumerate(shuffled):
        groups[idx % num_groups].append(student)
    return groups


def genetic_grouping(
    students_data: List[Student],
    group_size: int,
    population_size: int = 60,
    generations: int = 120,
    mutation_rate: float = 0.25,
    elitism: float = 0.1,
) -> Tuple[List[List[Student]], Dict[str, Any]]:
    n_students = len(students_data)
    if n_students == 0 or group_size <= 0:
        return [], {
            "method": "genetic",
            "populationSize": population_size,
            "generations": generations,
            "bestFitness": 0.0,
            "improvement": 0.0,
        }

    num_groups = max(1, (n_students + group_size - 1) // group_size)
    base_size = n_students // num_groups
    overflow = n_students % num_groups
    target_sizes = [base_size + (1 if i < overflow else 0) for i in range(num_groups)]

    population = [_make_random_chromosome(n_students, target_sizes) for _ in range(population_size)]
    best_so_far: Optional[Tuple[List[List[int]], float]] = None

    for gen in range(generations):
        scored = [(_chromosome_fitness(chrom, students_data, target_sizes), chrom) for chrom in population]
        scored.sort(key=lambda item: item[0], reverse=True)

        if best_so_far is None or scored[0][0] > best_so_far[1]:
            best_so_far = (scored[0][1], scored[0][0])

        elite_count = max(2, int(population_size * elitism))
        next_pop = [chrom for _, chrom in scored[:elite_count]]

        while len(next_pop) < population_size:
            parent1 = random.choice(scored[: population_size // 2])[1]
            parent2 = random.choice(scored[: population_size // 2])[1]
            child = _crossover(parent1, parent2, target_sizes)
            _mutate(child, mutation_rate)
            next_pop.append(child)

        population = next_pop

    best_chromosome = best_so_far[0] if best_so_far else population[0]
    groups = [[students_data[i] for i in grp] for grp in best_chromosome]

    metrics = {
        "method": "genetic",
        "populationSize": population_size,
        "generations": generations,
        "bestFitness": best_so_far[1] if best_so_far else 0.0,
        "targetSizes": target_sizes,
    }
    return groups, metrics


def metrics_for_groups(groups: List[List[Student]]) -> Dict[str, Any]:
    total_fitness = 0.0
    detail = []
    for group in groups:
        m = _build_group_metrics(group)
        detail.append(m)
        total_fitness += m["fitness"]

    return {
        "totalGroups": len(groups),
        "totalFitness": total_fitness,
        "averageFitness": total_fitness / len(groups) if groups else 0.0,
        "groupMetrics": detail,
    }
