import re

def normalize_name(name: str) -> str:
    """
    Standard normalization for inventory item names.
    Removes special characters, converts to lowercase, and strips whitespace.
    Used for reliable matching between core requirements and inventory items.
    """
    if not name:
        return ""
    # Lowercase and strip
    n = name.lower().strip()
    # Remove everything except letters, numbers, and spaces
    n = re.sub(r'[^a-z0-9\s]', '', n)
    # Replace multiple spaces with a single space
    n = re.sub(r'\s+', ' ', n)
    return n.strip()
