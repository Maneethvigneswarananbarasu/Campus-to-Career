from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
import json

llm = ChatOllama(
    model="llama3",
    temperature=0.1,
    format="json"
)


def generate_coding_problem(
    skills="Python",
    difficulty="Medium"
):
    prompt = f"""
Create exactly one Python programming assessment.

Candidate skills: {skills}
Difficulty: {difficulty}

The assessment must use ONLY:
- integers
- floats
- strings
- lists
- dictionaries

Do NOT generate:
- linked lists
- trees
- graphs
- custom classes
- objects
- recursion-based structures
- external libraries
- file handling
- database operations
- input() calls

The student will implement only one Python function.

Return exactly this JSON structure:

{{
  "title": "string",
  "difficulty": "{difficulty}",
  "topic": "string",
  "description": "string",
  "constraints": ["string", "string"],
  "examples": [
    {{
      "input": {{"parameter_name": "value"}},
      "output": "value",
      "explanation": "string"
    }}
  ],
  "function_name": "string",
  "starter_code": "def function_name(parameter):\\n    pass",
  "hidden_test_cases": [
    {{
      "input": {{"parameter_name": "value"}},
      "expected_output": "value"
    }}
  ]
}}

Rules:

1. Generate exactly one problem.
2. The problem must be solvable using Python.
3. Use only supported data types listed above.
4. The function must contain exactly the function_name provided.
5. starter_code must contain the function definition and pass.
6. Do not include input() in starter_code.
7. Do not include print() in starter_code.
8. Generate at least 5 hidden test cases.
9. Every hidden test case must contain valid input.
10. Every hidden test case must contain a real expected_output.
11. expected_output must never be null.
12. Expected outputs must be correct.
13. Use the same parameter names in starter_code and every test case.
14. The examples must follow the same input structure as hidden_test_cases.
15. Do not use markdown.
16. Do not use code fences.
17. Do not add text before or after the JSON.
18. Return valid JSON only.

Candidate skills: {skills}
Difficulty: {difficulty}
"""

    messages = [
        SystemMessage(
            content="Return only valid JSON. Never return markdown or explanations outside the JSON."
        ),
        HumanMessage(
            content=prompt
        )
    ]

    response = llm.invoke(messages)

    content = response.content

    print("========== OLLAMA RESPONSE ==========")
    print(repr(content))
    print("======================================")

    if not content:
        raise ValueError("Ollama returned an empty response")

    content = content.strip()

    if content.startswith("```json"):
        content = content[7:]

    if content.startswith("```"):
        content = content[3:]

    if content.endswith("```"):
        content = content[:-3]

    content = content.strip()

    try:
        problem = json.loads(content)
    except json.JSONDecodeError as e:
        raise ValueError(f"AI generated invalid JSON: {e}")

    required_fields = [
        "title",
        "difficulty",
        "topic",
        "description",
        "constraints",
        "examples",
        "function_name",
        "starter_code",
        "hidden_test_cases"
    ]

    for field in required_fields:
        if field not in problem:
            raise ValueError(
                f"Generated problem is missing field: {field}"
            )

    return problem