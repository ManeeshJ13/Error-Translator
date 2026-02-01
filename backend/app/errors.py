#simple error pattern database
ERROR_PATTERNS = [
    {
        "regex":"TypeError:.*undefined.*function*",
        "explanation":"You're trying to call something that doesn't exist or isn't a function.",
        "fix":"Check if the variable exists before calling:\nif (typeof myFunction === 'function') {\n  myFunction();\n}",
        "language":"javascript",
        "confidence":0.9
    },
     {
        "regex": "ModuleNotFoundError:",
        "explanation": "Python can't find the module you're trying to import.",
        "fix": "Install the missing package:\npip install package-name",
        "language": "python",
        "confidence": 0.95
    },
    {
        "regex": "segmentation fault",
        "explanation": "Your C program tried to access memory it shouldn't.",
        "fix": "Use valgrind to debug:\nvalgrind ./your_program",
        "language": "c",
        "confidence": 0.8
    }
]

def find_error_solution(error_text:str):
    """Find a matching error pattern"""
    import re

    for pattern in ERROR_PATTERNS:
        if re.search(pattern["regex"], error_text, re.IGNORECASE):
            return {
                "Explanation": pattern["explanation"],
                "Fix": pattern["fix"],
                "Confidence": pattern["confidence"],
                "Language": pattern["language"]
            }
    
    #no match found
    return {
        "Explanation": "Exact Error not identified",
        "Fix": "Try \n1.Googling the error \n2.Checking StackOverflow \n3.Look for typos in your code",
        "Confidence": 0.3,
        "Language": "Unknown"
    }