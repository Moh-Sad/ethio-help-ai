import sys
import os
import zipfile
import re
import xml.etree.ElementTree as ET
import subprocess

def extract_pdf(filepath):
    try:
        # Run pdftotext CLI utility
        result = subprocess.run(['pdftotext', filepath, '-'], capture_output=True, text=True, check=True)
        return result.stdout
    except Exception as e:
        return f"PDF extraction error: {str(e)}"

def extract_docx(filepath):
    try:
        with zipfile.ZipFile(filepath) as z:
            xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            # Find all text nodes under w:t
            texts = []
            for node in root.findall('.//w:t', namespaces):
                if node.text:
                    texts.append(node.text)
            return "".join(texts)
    except Exception as e:
        return f"DOCX extraction error: {str(e)}"

def extract_pptx(filepath):
    try:
        texts = []
        with zipfile.ZipFile(filepath) as z:
            # Slides are named ppt/slides/slide1.xml, ppt/slides/slide2.xml, etc.
            slide_files = [name for name in z.namelist() if name.startswith('ppt/slides/slide') and name.endswith('.xml')]
            # Sort them numerically
            slide_files.sort(key=lambda x: int(re.search(r'\d+', x).group()))
            
            namespaces = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
            
            for slide_file in slide_files:
                xml_content = z.read(slide_file)
                root = ET.fromstring(xml_content)
                slide_texts = []
                for node in root.findall('.//a:t', namespaces):
                    if node.text:
                        slide_texts.append(node.text)
                if slide_texts:
                    texts.append(" ".join(slide_texts))
        return "\n".join(texts)
    except Exception as e:
        return f"PPTX extraction error: {str(e)}"

def extract_binary_office(filepath):
    """
    Fallback extractor for binary .doc and .ppt formats.
    Extracts contiguous ASCII and UTF-16LE printable strings from binary data.
    """
    try:
        with open(filepath, 'rb') as f:
            data = f.read()
        
        # Regex for ASCII printable characters (length >= 4)
        ascii_pattern = re.compile(b'[\\x20-\\x7E]{4,}')
        # Regex for UTF-16LE characters (length >= 4)
        utf16_pattern = re.compile(b'(?:[\\x20-\\x7E]\\x00){4,}')
        
        extracted = []
        for match in ascii_pattern.finditer(data):
            try:
                text = match.group().decode('ascii')
                # Filter out obvious binary garbage strings
                if len(text.strip()) > 3:
                    extracted.append(text.strip())
            except:
                pass
                
        for match in utf16_pattern.finditer(data):
            try:
                text = match.group().decode('utf-16le')
                if len(text.strip()) > 3:
                    extracted.append(text.strip())
            except:
                pass
                
        # Clean up lines and join
        cleaned_lines = []
        for line in extracted:
            # Remove repeated spaces/garbage
            line = re.sub(r'\s+', ' ', line)
            if line and not line.startswith('Word.Document') and not line.startswith('PowerPoint'):
                cleaned_lines.append(line)
                
        return "\n".join(cleaned_lines)
    except Exception as e:
        return f"Binary office extraction error: {str(e)}"

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 extractor.py <filepath>")
        sys.exit(1)
        
    filepath = sys.argv[1]
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        sys.exit(1)
        
    _, ext = os.path.splitext(filepath.lower())
    
    if ext == '.pdf':
        text = extract_pdf(filepath)
    elif ext == '.docx':
        text = extract_docx(filepath)
    elif ext == '.pptx':
        text = extract_pptx(filepath)
    elif ext in ['.doc', '.ppt']:
        text = extract_binary_office(filepath)
    else:
        # Generic fallback
        text = extract_binary_office(filepath)
        
    print(text)

if __name__ == '__main__':
    main()
