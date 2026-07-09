import numpy as np
import re
from typing import Tuple, List

# Lazy loading of sentence-transformers to avoid heavy startup times if not needed
_model = None

def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        # using a lightweight model for speed and minimal RAM overhead
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model


def chunk_text(text: str, max_words_per_chunk: int = 150) -> List[str]:
    """
    Cleans and splits text into logical paragraphs or chunks for embedding.
    """
    if not text:
        return []
    
    # Simple cleaning: normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Split roughly by sentences (heuristically via '. ')
    sentences = text.split('. ')
    
    chunks = []
    current_chunk = []
    current_word_count = 0
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        # Add the period back if it was stripped
        if not sentence.endswith('.'):
            sentence += '.'
            
        words = sentence.split()
        
        # If a single sentence is huge, just add it (or it could be further chunked, but let's keep it simple)
        if current_word_count + len(words) > max_words_per_chunk and current_chunk:
            chunks.append(' '.join(current_chunk))
            current_chunk = [sentence]
            current_word_count = len(words)
        else:
            current_chunk.append(sentence)
            current_word_count += len(words)
            
    if current_chunk:
        chunks.append(' '.join(current_chunk))
        
    return chunks


def compute_proposal_embeddings(text: str) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Takes extracted text and computes:
    1. doc_embedding (1D array)
    2. para_embeddings (2D array, N x embedding_dim)
    3. paragraphs (List of strings)
    
    Returns (doc_embedding, para_embeddings, paragraphs)
    """
    paragraphs = chunk_text(text)
    
    if not paragraphs:
        # Return empty representations if no text
        return np.zeros(384, dtype=np.float32), np.zeros((0, 384), dtype=np.float32), []
        
    model = get_model()
    
    # Encode all paragraphs -> (N, embedding_dim)
    # output is a numpy array (float32)
    para_embeddings = model.encode(paragraphs, convert_to_numpy=True)
    
    # Document embedding is the mean pooling of paragraph embeddings
    doc_embedding = np.mean(para_embeddings, axis=0)
    
    # Normalize doc_embedding to unit length for cosine similarity via dot product
    norm = np.linalg.norm(doc_embedding)
    if norm > 0:
        doc_embedding = doc_embedding / norm
        
    return doc_embedding, para_embeddings, paragraphs


def serialize_embedding(emb: np.ndarray) -> bytes:
    """Serializes a NumPy array to bytes for storage in a BinaryField."""
    if emb is None:
        return b''
    return emb.astype(np.float32).tobytes()


def deserialize_embedding(data: bytes, shape=None) -> np.ndarray:
    """Deserializes bytes back to a NumPy float32 array. Reshapes if shape is provided."""
    if not data:
        return np.array([], dtype=np.float32)
    arr = np.frombuffer(data, dtype=np.float32)
    if shape:
        return arr.reshape(shape)
    return arr
