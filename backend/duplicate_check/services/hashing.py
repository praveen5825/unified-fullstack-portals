import hashlib

def compute_text_hash(text: str) -> str:
    """Computes a SHA-256 hash of the given text."""
    if not text:
        return ""
    return hashlib.sha256(text.encode('utf-8')).hexdigest()
