from typing import Any, Dict, Optional

DEFAULT_DOMAIN = "frontend"

# Known domain aliases and their canonical keys.
DOMAIN_ALIASES = {
    "front": "frontend",
    "frontend": "frontend",
    "front-end": "frontend",
    "front end": "frontend",
    "back": "backend",
    "backend": "backend",
    "back-end": "backend",
    "back end": "backend",
    "data": "database",
    "database": "database",
    "data base": "database",
    "db": "database",
    "ai": "ai",
    "devops": "devops",
}

# Display labels for test assignment.
DOMAIN_LABELS = {
    "frontend": "Frontend Skill Assessment",
    "backend": "Backend Skill Assessment",
    "database": "Database Skill Assessment",
}

VALID_DOMAINS = list(DOMAIN_LABELS.keys())


def normalize_domain(value: Any) -> str:
    """Normalize a user-selected domain into a canonical domain key."""
    domain_value = str(value or "").strip().lower()
    if not domain_value:
        return DEFAULT_DOMAIN

    for alias, canonical in DOMAIN_ALIASES.items():
        if alias in domain_value:
            return canonical

    return domain_value


def is_known_domain(value: Any) -> bool:
    """Return True if a domain is one of the known base domains."""
    return normalize_domain(value) in VALID_DOMAINS


def test_title_for_domain(domain: str) -> str:
    """Return a user-friendly label for a domain test."""
    normalized = normalize_domain(domain)
    if normalized in DOMAIN_LABELS:
        return DOMAIN_LABELS[normalized]
    return f"{normalized.capitalize()} Skill Assessment"


def find_test_for_domain(tests_collection, domain: Any) -> Optional[Dict[str, Any]]:
    """Query the tests collection for the best test matching the normalized domain."""
    normalized = normalize_domain(domain)
    if normalized not in VALID_DOMAINS:
        return None
    return tests_collection.find_one({"domain": normalized}, sort=[("createdAt", 1)])
