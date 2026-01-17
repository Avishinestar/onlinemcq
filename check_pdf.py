import sys
try:
    import pdfplumber
    print("pdfplumber is installed")
    with pdfplumber.open("Employability Skills 2022 - 1st year.pdf") as pdf:
        first_page = pdf.pages[0]
        print(first_page.extract_text())
except ImportError:
    print("pdfplumber is NOT installed")
except Exception as e:
    print(f"Error: {e}")
