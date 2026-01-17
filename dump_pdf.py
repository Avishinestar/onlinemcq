import pdfplumber

with pdfplumber.open("Employability Skills 2022 - 1st year.pdf") as pdf:
    with open("pdf_dump.txt", "w", encoding="utf-8") as f:
        for i, page in enumerate(pdf.pages[:10]): # First 10 pages should look enough
            text = page.extract_text()
            f.write(f"\n--- PAGE {i+1} ---\n")
            if text:
                f.write(text)
            else:
                f.write("[NO TEXT EXTRACTED]")
