"""
Text diff service for duplicate detection.

Strategy:
  Stage 1 — Exact paragraph/sentence matches via SequenceMatcher 'equal' opcodes.
  Stage 2 — Near-duplicate sentences: for each 'replace' opcode, pair source and
             target sentences and include those whose SequenceMatcher.ratio() ≥
             NEAR_MATCH_THRESHOLD (default 0.82).  This catches single-word
             substitutions, minor paraphrasing, and OCR artefacts without
             requiring any GPU or embedding models.

Each matched entry carries a ``similarity_ratio`` (1.0 = exact, 0.82–0.99 = near)
so the frontend can shade highlights by confidence level.
``paragraph_scores`` is a flat list of {index, score} for the paragraph jump-to panel.
"""
import difflib
import re

# Sentences whose SequenceMatcher ratio meets or exceeds this value are treated
# as near-duplicates.  0.82 catches ~1-3 word substitutions in typical proposal
# sentences without generating too many false positives.
NEAR_MATCH_THRESHOLD = 0.82

# Paragraphs are scored individually; only those at or above this similarity
# ratio are included in paragraph_scores.
PARA_MATCH_THRESHOLD = 0.70


def clean_text(text: str) -> str:
    """Normalises whitespace and lowercases for comparison."""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip().lower()


def _split_sentences(text: str) -> list[str]:
    """Splits on sentence-ending punctuation followed by whitespace."""
    parts = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in parts if s.strip()]


def _split_paragraphs(text: str) -> list[str]:
    """Splits on one or more blank lines."""
    parts = re.split(r'\n\s*\n', text)
    return [p.strip() for p in parts if p.strip()]


def compute_text_diff(source_text: str, target_text: str) -> dict:
    """
    Compare two document texts and return matched spans at paragraph and
    sentence level.

    Returns a dict with:
      matched_paragraphs  – list of {source_index, target_index, text, similarity_ratio}
      paragraph_scores    – list of {index, score} for every source paragraph scored
                            against its best target paragraph (0-100 range)
      matched_sentences   – list of {source_index, target_index, text, similarity_ratio}
      matched_words       – word count inside matched sentences
      total_words         – total word count of source_text
    """
    if not source_text or not target_text:
        return {
            'matched_paragraphs': [],
            'paragraph_scores': [],
            'matched_sentences': [],
            'matched_words': 0,
            'total_words': 0,
        }

    source_paras = _split_paragraphs(source_text)
    target_paras = _split_paragraphs(target_text)
    source_sents = _split_sentences(source_text)
    target_sents = _split_sentences(target_text)

    clean_src_paras = [clean_text(p) for p in source_paras]
    clean_tgt_paras = [clean_text(p) for p in target_paras]
    clean_src_sents = [clean_text(s) for s in source_sents]
    clean_tgt_sents = [clean_text(s) for s in target_sents]

    # ── Paragraph matching ──────────────────────────────────────────────────
    matched_paragraphs: list[dict] = []
    paragraph_scores: list[dict] = []

    sm_para = difflib.SequenceMatcher(None, clean_src_paras, clean_tgt_paras)
    for tag, i1, i2, j1, j2 in sm_para.get_opcodes():
        if tag == 'equal':
            for offset, i in enumerate(range(i1, i2)):
                matched_paragraphs.append({
                    'source_index': i,
                    'target_index': j1 + offset,
                    'source_text': source_paras[i],
                    'target_text': target_paras[j1 + offset],
                    'text': source_paras[i],
                    'similarity_ratio': 1.0,
                })
        elif tag == 'replace':
            # Score each source paragraph against each target paragraph in the block
            for i in range(i1, i2):
                best_ratio = 0.0
                best_j = j1
                for j in range(j1, j2):
                    r = difflib.SequenceMatcher(None, clean_src_paras[i], clean_tgt_paras[j]).ratio()
                    if r > best_ratio:
                        best_ratio = r
                        best_j = j
                if best_ratio >= PARA_MATCH_THRESHOLD:
                    matched_paragraphs.append({
                        'source_index': i,
                        'target_index': best_j,
                        'source_text': source_paras[i],
                        'target_text': target_paras[best_j],
                        'text': source_paras[i],
                        'similarity_ratio': round(best_ratio, 3),
                    })

    # Build paragraph_scores for every source paragraph (not just matched ones)
    for i, src_p in enumerate(clean_src_paras):
        if not src_p:
            continue
        best = 0.0
        for tgt_p in clean_tgt_paras:
            r = difflib.SequenceMatcher(None, src_p, tgt_p).ratio()
            if r > best:
                best = r
        paragraph_scores.append({'index': i, 'score': round(best * 100, 1)})

    # ── Sentence matching ───────────────────────────────────────────────────
    matched_sentences: list[dict] = []
    matched_words_count = 0
    total_words_count = len(clean_text(source_text).split())

    sm_sent = difflib.SequenceMatcher(None, clean_src_sents, clean_tgt_sents)
    for tag, i1, i2, j1, j2 in sm_sent.get_opcodes():
        if tag == 'equal':
            for offset, i in enumerate(range(i1, i2)):
                sent = source_sents[i]
                matched_words_count += len(clean_text(sent).split())
                matched_sentences.append({
                    'source_index': i,
                    'target_index': j1 + offset,
                    'source_text': sent,
                    'target_text': target_sents[j1 + offset],
                    'text': sent,
                    'similarity_ratio': 1.0,
                })
        elif tag == 'replace':
            # Pair each source sentence with its closest target sentence in the block
            for i in range(i1, i2):
                best_ratio = 0.0
                best_j = j1
                for j in range(j1, j2):
                    r = difflib.SequenceMatcher(
                        None, clean_src_sents[i], clean_tgt_sents[j]
                    ).ratio()
                    if r > best_ratio:
                        best_ratio = r
                        best_j = j
                if best_ratio >= NEAR_MATCH_THRESHOLD:
                    sent = source_sents[i]
                    matched_words_count += len(clean_text(sent).split())
                    matched_sentences.append({
                        'source_index': i,
                        'target_index': best_j,
                        'source_text': sent,
                        'target_text': target_sents[best_j],
                        'text': sent,
                        'similarity_ratio': round(best_ratio, 3),
                    })

    # Sort by source_index for deterministic ordering
    matched_paragraphs.sort(key=lambda x: x['source_index'])
    matched_sentences.sort(key=lambda x: x['source_index'])

    return {
        'matched_paragraphs': matched_paragraphs,
        'paragraph_scores': paragraph_scores,
        'matched_sentences': matched_sentences,
        'matched_words': matched_words_count,
        'total_words': total_words_count,
    }

