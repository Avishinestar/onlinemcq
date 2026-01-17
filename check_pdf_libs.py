try:
    import PyPDF2
    print("PyPDF2 is installed")
except ImportError:
    print("PyPDF2 is NOT installed")

try:
    import pypdf
    print("pypdf is installed")
except ImportError:
    print("pypdf is NOT installed")
