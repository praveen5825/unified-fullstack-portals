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
 *   exactBlocks: Set of lowercase full text blocks for exact matches (similarity >= 95)
 *   highlightWords: Set of specific intersecting words for partial semantic matches
 * }
 */
export function buildHighlightData(matchedParagraphs = []) {
  const exactBlocks = new Set();
  const highlightWords = new Set();

  for (const p of matchedParagraphs) {
    if (!p.source_text || !p.target_text) continue;

    // 95% or higher is considered a near-exact match, highlight the entire block
    if (p.similarity >= 95) {
      exactBlocks.add(p.source_text.toLowerCase().trim());
      // Add first 40 chars as fragment key for multi-line text layer items
      if (p.source_text.length > 40) {
        exactBlocks.add(p.source_text.substring(0, 40).toLowerCase().trim());
      }
    } else {
      // It's a semantic match/paraphrase. Extract and highlight only the common vocabulary.
      const common = getIntersectingWords(p.source_text, p.target_text);
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
