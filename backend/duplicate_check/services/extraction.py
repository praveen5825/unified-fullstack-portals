"""
Text extraction service.
Strategy: PyMuPDF first (fast, works for digital/typed PDFs like the sample
proposal.pdf we tested with -- it pulled clean text instantly).
Falls back to Tesseract OCR only when PyMuPDF gets little/no text back,
which happens for scanned/photographed proposal documents.
"""
import io
import fitz  # PyMuPDF
import pytesseract
from PIL import Image

MIN_TEXT_LENGTH_THRESHOLD = 50  # below this, treat as "likely scanned, needs OCR"


def extract_text_pymupdf(pdf_path: str) -> str:
    text = ""
    doc = fitz.open(pdf_path)
    try:
        for page in doc:
            text += page.get_text()
    finally:
        doc.close()
    return text.strip()


def extract_text_tesseract(pdf_path: str, dpi: int = 300) -> str:
    text = ""
    doc = fitz.open(pdf_path)
    try:
        for page in doc:
            pix = page.get_pixmap(dpi=dpi)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            text += pytesseract.image_to_string(img)
    finally:
        doc.close()
    return text.strip()


def extract_proposal_text(pdf_path: str) -> str:
    text = extract_text_pymupdf(pdf_path)
    if len(text) < MIN_TEXT_LENGTH_THRESHOLD:
        text = extract_text_tesseract(pdf_path)
    return text
