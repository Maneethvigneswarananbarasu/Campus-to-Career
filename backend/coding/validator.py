import ast

REQUIRED_FIELDS = [
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


def validate_problem(problem):
    for field in REQUIRED_FIELDS:
        if field not in problem:
            return False, f"Missing field: {field}"

    if problem["difficulty"] not in ["Easy", "Medium", "Hard"]:
        return False, "Invalid difficulty"

    if not isinstance(problem["constraints"], list):
        return False, "Constraints must be a list"

    if not isinstance(problem["examples"], list):
        return False, "Examples must be a list"

    if len(problem["examples"]) < 1:
        return False, "At least one example is required"

    if not isinstance(problem["hidden_test_cases"], list):
        return False, "Hidden test cases must be a list"

    if len(problem["hidden_test_cases"]) < 5:
        return False, "At least 5 hidden test cases are required"

    if not isinstance(problem["function_name"], str):
        return False, "Function name must be a string"

    if not isinstance(problem["starter_code"], str):
        return False, "Starter code must be a string"

    try:
        tree = ast.parse(problem["starter_code"])
    except SyntaxError as e:
        return False, f"Invalid starter code: {e}"

    function_names = [
        node.name
        for node in ast.walk(tree)
        if isinstance(node, ast.FunctionDef)
    ]

    if problem["function_name"] not in function_names:
        return False, "Function name does not exist in starter code"

    for test_case in problem["hidden_test_cases"]:
        if "input" not in test_case:
            return False, "Hidden test case missing input"

        if "expected_output" not in test_case:
            return False, "Hidden test case missing expected output"

        if test_case["expected_output"] is None:
            return False, "Hidden test case expected output cannot be null"

    return True, "Problem is valid"