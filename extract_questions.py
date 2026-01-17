import pdfplumber
import json
import re

def clean_text(text):
    if text:
        return text.replace('\n', ' ').strip()
    return ""

def extract_questions():
    file_path = "Employability Skills 2022 - 1st year.pdf"
    questions_db = {}
    current_module = "General"
    
    print(f"Opening {file_path}...")
    
    with pdfplumber.open(file_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"Total pages: {total_pages}")
        
        for i, page in enumerate(pdf.pages):
            # Skip first 2 pages (Cover and Index) generally, 
            # but let's check for Module Name on all pages just in case.
            
            text = page.extract_text()
            if not text:
                continue
                
            # Try to find Module Name
            # Pattern looking for "Module Name : <Name>"
            match = re.search(r"Module Name\s*:\s*(.*)", text)
            if match:
                raw_module = match.group(1).strip()
                # fast cleanup if it captures extra stuff
                # e.g. "Introduction to..." might have a trailing line header
                if "Correct" in raw_module: # "Correct" from the table header often bleeds in
                    raw_module = raw_module.split("Correct")[0].strip()
                current_module = raw_module
                if current_module not in questions_db:
                    questions_db[current_module] = []
                # print(f"Page {i+1}: Found Module '{current_module}'")
            
            # Extract Table
            # We use generous settings to catch tables
            tables = page.extract_tables()
            
            for table in tables:
                for row in table:
                    # Heuristic to check if it's a valid question row
                    # Row should have roughly 8 columns: 
                    # Lesson, QNo, Q, A, B, C, D, Ans
                    
                    if len(row) < 7:
                        continue
                    
                    # Check if it's a header row
                    # If column 2 or 3 contains "Question" or "Option"
                    is_header = False
                    for cell in row:
                        if cell and ("Option A" in cell or "Correct Answer" in cell or "Q.No." in cell):
                            is_header = True
                            break
                    if is_header:
                        continue
                        
                    # Extract Data
                    # Index might shift if "Lesson Name" is missing or merged? 
                    # Based on test, we had 8 columns.
                    # 0: Lesson Name
                    # 1: Q.No
                    # 2: Question
                    # 3: A
                    # 4: B
                    # 5: C
                    # 6: D
                    # 7: Ans
                    
                    try:
                        # Sometimes row length varies slightly
                        # We assume the LAST column is Answer, and the 5 preceding are Options D, C, B, A, and Question
                        
                        # Let's try standard indexing
                        if len(row) == 8:
                            # Standard case
                            q_text = clean_text(row[2])
                            opts = [
                                clean_text(row[3]),
                                clean_text(row[4]),
                                clean_text(row[5]),
                                clean_text(row[6])
                            ]
                            ans_letter = clean_text(row[7])
                        else:
                            # Fallback logic?
                            # If we have merged columns, it's hard.
                            # But looking at pdfplumber output, it usually puts None for merged vertical cells (Lesson Name)
                            # Let's hope columns are aligned.
                            continue

                        # Validate
                        if not q_text or not ans_letter:
                            continue
                            
                        # Map A, B, C, D to actual text
                        ans_map = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
                        correct_text = ""
                        
                        # Clean Answer Letter "A" or "A\n" or "a"
                        ans_letter_clean = ans_letter[0].upper()
                        if ans_letter_clean in ans_map:
                            correct_text = opts[ans_map[ans_letter_clean]]
                        else:
                            # Sometimes answer might be the text itself? Unlikely in this format.
                            continue

                        q_obj = {
                            "question": q_text,
                            "options": opts,
                            "answer": correct_text,
                            "id": clean_text(row[1]) # Q No
                        }
                        
                        # Add to DB
                        if current_module not in questions_db:
                            questions_db[current_module] = [] # Fallback if module matching failed
                        
                        # Avoid duplicates?
                        questions_db[current_module].append(q_obj)
                        
                    except Exception as e:
                        # print(f"Row error: {e}")
                        continue

    # Summary
    print("\nExtraction Summary:")
    final_db = {}
    for mod, questions in questions_db.items():
        print(f"Module '{mod}': {len(questions)} questions")
        if len(questions) > 0:
            final_db[mod] = questions
            
    with open("questions.json", "w", encoding="utf-8") as f:
        json.dump(final_db, f, indent=2)
    print("\nSaved to questions.json")

if __name__ == "__main__":
    extract_questions()
