/**
 * textHighlighting.js
 * Utilities for analyzing semantically matched text blocks and finding exact intersecting words,
 * ignoring common stop words, for precise UI highlighting.
 */

const STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 
  'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 
  'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 
  'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 
  'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 
  'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 
  'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 
  'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 
  'will', 'just', 'don', 'should', 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 
  'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn', 'ma', 'mightn', 
  'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren', 'won', 'wouldn', 'also'
]);

/**
 * Tokenizes text into lowercase words.
 */
function tokenize(text) {
  if (!text) return [];
  // Match contiguous alphanumeric strings
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []);
}

/**
 * Computes common significant words between two text strings.
 * @param {string} text1 
 * @param {string} text2 
 * @returns {Set<string>} A set of intersecting non-stop words
 */
export function getIntersectingWords(text1, text2) {
  const set1 = new Set(tokenize(text1));
  const set2 = new Set(tokenize(text2));
  
  const common = new Set();
  for (const word of set1) {
    if (set2.has(word) && !STOP_WORDS.has(word) && word.length > 2) {
      common.add(word);
    }
  }
  return common;
}

/**
 * Builds highlight data structures for the CompareViewer given the matched_paragraphs array.
 * Returns:
 * {
 *   exactBlocks: Set of lowercase full text blocks for exact matches (similarity_ratio >= 0.95)
 *   highlightWords: Set of specific intersecting words for partial semantic matches
 * }
 *
 * Field name notes (backend `text_diff.py` returns):
 *   similarity_ratio  – float 0–1  (NOT "similarity", NOT 0–100)
 *   source_text       – text of the source paragraph (new format)
 *   target_text       – text of the matched paragraph (new format)
 *   text              – legacy alias for source_text (kept for backward compat)
 */
export function buildHighlightData(matchedParagraphs = []) {
  const exactBlocks = new Set();
  const highlightWords = new Set();

  for (const p of matchedParagraphs) {
    // Support both new field names and the legacy `text` field
    const sourceText = p.source_text || p.text || '';
    const targetText = p.target_text || p.text || '';
    if (!sourceText) continue;

    // similarity_ratio is a 0–1 float; >= 0.95 is considered near-exact
    const ratio = p.similarity_ratio ?? (p.similarity != null ? p.similarity / 100 : 0);

    if (ratio >= 0.95) {
      const lower = sourceText.toLowerCase().trim();
      exactBlocks.add(lower);
      // Add sub-fragments so multi-line PDF text layer items are matched
      const words = lower.split(/\s+/);
      // Add every window of 6+ consecutive words as an exact block fragment
      for (let start = 0; start < words.length - 5; start++) {
        for (let len = 6; len <= Math.min(20, words.length - start); len++) {
          exactBlocks.add(words.slice(start, start + len).join(' '));
        }
      }
    } else {
      // Semantic/paraphrase match — highlight only the common significant vocabulary
      const common = getIntersectingWords(sourceText, targetText);
      for (const w of common) {
        highlightWords.add(w);
      }
    }
  }

  return { exactBlocks, highlightWords };
}

/**
 * Helper to wrap matched words in a string with HTML marks.
 * Useful for the sidebar breakdown view.
 */
export function wrapIntersectingWords(text, highlightWordsSet) {
  if (!text || highlightWordsSet.size === 0) return text;
  
  // Replace words that exist in the highlightWordsSet
  // Word boundary regex
  return text.replace(/\b([a-z0-9]+)\b/gi, (match, word) => {
    if (highlightWordsSet.has(word.toLowerCase())) {
      return `<mark class="bg-warning-soft text-warning rounded px-0.5">${match}</mark>`;
    }
    return match;
  });
}
