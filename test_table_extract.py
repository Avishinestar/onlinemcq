import pdfplumber
import json

def test_extract():
    with pdfplumber.open("Employability Skills 2022 - 1st year.pdf") as pdf:
        # Page 3 (index 2) is where questions start
        page = pdf.pages[2] 
        
        # Try generic table extraction
        table = page.extract_table()
        
        if table:
            print(f"Found table with {len(table)} rows")
            # Print first 5 rows to check structure
            for row in table[:5]:
                print(row)
        else:
            print("No table found with default settings")
            # Try with different settings if needed, but let's see default first
            
if __name__ == "__main__":
    test_extract()
