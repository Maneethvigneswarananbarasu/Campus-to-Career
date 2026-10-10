import subprocess
import tempfile
import os
import sys
import json
import ast


def get_function_parameters(code, function_name):
    tree = ast.parse(code)

    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == function_name:
            return [
                arg.arg
                for arg in node.args.args
            ]

    return []


def run_code(code, function_name, test_cases, timeout=3):
    results = []

    try:
        parameters = get_function_parameters(
            code,
            function_name
        )
    except Exception as e:
        return [
            {
                "input": test_case.get("input"),
                "status": "error",
                "output": "",
                "error": str(e)
            }
            for test_case in test_cases
        ]

    for test_case in test_cases:
        input_data = test_case.get("input")

        if (
            isinstance(input_data, dict)
            and len(parameters) == 1
            and parameters[0] not in input_data
            and len(input_data) == 1
        ):
            input_data = {
                parameters[0]: next(
                    iter(input_data.values())
                )
            }

        wrapper_code = f"""
import json
import sys

{code}

try:
    input_data = json.loads(sys.argv[1])

    if isinstance(input_data, dict):
        result = {function_name}(**input_data)
    elif isinstance(input_data, list):
        result = {function_name}(*input_data)
    else:
        result = {function_name}(input_data)

    print(json.dumps(result))

except Exception as e:
    print(json.dumps({{"error": str(e)}}))
"""

        temp_path = None

        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".py",
                delete=False,
                encoding="utf-8"
            ) as temp_file:
                temp_file.write(wrapper_code)
                temp_path = temp_file.name

            process = subprocess.run(
                [
                    sys.executable,
                    temp_path,
                    json.dumps(input_data)
                ],
                capture_output=True,
                text=True,
                timeout=timeout
            )

            stdout = process.stdout.strip()
            stderr = process.stderr.strip()

            if process.returncode != 0:
                results.append({
                    "input": input_data,
                    "status": "error",
                    "output": "",
                    "error": stderr
                })
                continue

            try:
                output = json.loads(stdout)
            except json.JSONDecodeError:
                output = stdout

            if isinstance(output, dict) and "error" in output:
                results.append({
                    "input": input_data,
                    "status": "error",
                    "output": "",
                    "error": output["error"]
                })
                continue

            results.append({
                "input": input_data,
                "status": "success",
                "output": output
            })

        except subprocess.TimeoutExpired:
            results.append({
                "input": input_data,
                "status": "timeout",
                "output": "",
                "error": "Time limit exceeded"
            })

        except Exception as e:
            results.append({
                "input": input_data,
                "status": "error",
                "output": "",
                "error": str(e)
            })

        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)

    return results