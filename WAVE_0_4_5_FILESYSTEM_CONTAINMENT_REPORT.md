# WAVE 0.4.5 FILESYSTEM CONTAINMENT REPORT

This report documents the verification of physical filesystem containment and symlink protection. Traversal, symlinked parent directories, symlink targets, UNC paths, and Windows drive paths are strictly rejected.

## Scenario Execution Matrix

| ID | Level | Description | Expected | Actual | Exit Code | Finding ID | Log File |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| CONT-01 | INTEGRATION | "Normal repository file accepted" | ACCEPTED_VALID_FILE | ACCEPTED_VALID_FILE | 0 | NONE | `CONT-01.log` |
| CONT-02 | INTEGRATION | "Normal nested file accepted" | ACCEPTED_NESTED_FILE | ACCEPTED_NESTED_FILE | 0 | NONE | `CONT-02.log` |
| CONT-03 | INTEGRATION | "Non-existing nested file under valid parent accepted" | ACCEPTED_NEW_NESTED_FILE | ACCEPTED_NEW_NESTED_FILE | 0 | NONE | `CONT-03.log` |
| CONT-04 | INTEGRATION | "Symlinked parent directory pointing outside repository rejected" | REJECTED_SYMLINK_PARENT_EXTERNAL | REJECTED_SYMLINK_PARENT_EXTERNAL | 0 | SYMLINK_PARENT_COMPONENT | `CONT-04.log` |
| CONT-05 | INTEGRATION | "Symlinked parent directory pointing internally rejected" | REJECTED_SYMLINK_PARENT_INTERNAL | REJECTED_SYMLINK_PARENT_INTERNAL | 0 | SYMLINK_PARENT_COMPONENT | `CONT-05.log` |
| CONT-06 | INTEGRATION | "Symlinked final target file rejected" | REJECTED_SYMLINK_TARGET | REJECTED_SYMLINK_TARGET | 0 | SYMLINK_TARGET | `CONT-06.log` |
| CONT-07 | UNIT | "Windows drive path rejected" | REJECTED_WINDOWS_DRIVE | REJECTED_WINDOWS_DRIVE | 0 | ABSOLUTE_PATH | `CONT-07.log` |
| CONT-08 | UNIT | "UNC network path rejected" | REJECTED_UNC_PATH | REJECTED_UNC_PATH | 0 | ABSOLUTE_PATH | `CONT-08.log` |
| CONT-09 | UNIT | "POSIX absolute path rejected" | REJECTED_POSIX_ABSOLUTE | REJECTED_POSIX_ABSOLUTE | 0 | ABSOLUTE_PATH | `CONT-09.log` |
| CONT-10 | UNIT | "Path traversal segment (..) rejected" | REJECTED_TRAVERSAL_PATH | REJECTED_TRAVERSAL_PATH | 0 | PATH_TRAVERSAL | `CONT-10.log` |
| CONT-11 | UNIT | "Path containing NUL byte rejected" | REJECTED_NUL_BYTE_PATH | REJECTED_NUL_BYTE_PATH | 0 | NUL_BYTE_PATH | `CONT-11.log` |
| CONT-12 | UNIT | "Directory path with trailing slash rejected" | REJECTED_DIRECTORY_SLASH | REJECTED_DIRECTORY_SLASH | 0 | DIRECTORY_PATH | `CONT-12.log` |
| CONT-13 | INTEGRATION | "Bare existing directory target rejected" | REJECTED_BARE_DIRECTORY | REJECTED_BARE_DIRECTORY | 0 | DIRECTORY_PATH | `CONT-13.log` |
| CONT-14 | UNIT | "Root target "." rejected" | REJECTED_ROOT_DOT | REJECTED_ROOT_DOT | 0 | DIRECTORY_PATH | `CONT-14.log` |

## Verification & Integrity
- Total Scenarios: 14
- Total Pass: 14
- Total Fail: 0
- All tests executed in isolated environments with raw logs and SHA-256 hashes captured.
