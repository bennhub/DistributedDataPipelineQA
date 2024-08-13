# Data Validation Tests

## Overview
This repository contains automated test scripts for validating the data analysis and target data processing of a Node.js application. The scripts are written using Playwright and cover various scenarios to ensure data integrity and proper functionality of the applications.

## Test Scripts
- `data-analysis-report.spec.js`: This script performs two key functions:
1. It generates a data analysis report by reading from the `events.log` file, processing the data, and writing it into a `data_analysis_report.txt` file.
2. It validates the generated report by comparing each entry in the report with the corresponding data in the `events.log` file to ensure accuracy. The test will fail if any discrepancies are found between the report and the log file.

- `data-target-graceful-validation.spec.js`: This script checks for mismatches in the target data, generates a report if discrepancies are found, and continues execution without failing the test. It ensures that the validation process handles errors gracefully by reporting them instead of terminating the process.

- `data-target-strict-validation.spec.js`: This script enforces strict validation of target data, ensuring absolute correctness by failing the test if any data mismatch is detected.

### Prerequisites

- Node.js (v12 or later)
- npm (comes with Node.js)
- Playwright

### InstallationInstall Playwright:

1. Clone the repository:
   ```bash
   git clone https://github.com/bennhub/DistributedDataPipelineQA.git
   cd DistributedDataPipelineQA
2. Install dependencies:
   ```bash
   npm install
2. Install Playwright:
   ```bash
   npx playwright install
4. Ensure you have the required services or scripts in place that generate the **events.log** file. This could be any application or set of processes that logs data to the file. 

### Running the Tests
You can run the tests using Playwright. Note that each test must be run individually, not as a complete suite. This ensures that the environment is properly set up and cleaned up for each specific test. The suite includes environment setup, running the test, and cleanup:

1. **Environment Setup**: Initializes the necessary processes and verifies that required files are present.
2. **Running the Test**: Executes the specific test, whether it's for data analysis report generation, graceful validation, or strict validation.
3. **Cleanup**: Terminates all running processes and removes any generated files to reset the environment for the next test.

### Instructions for Running Each Test Individually:
- To run a test individually, use the following command in your terminal:

- `npx playwright test tests/data-analysis-report.spec.js`
- `npx playwright test tests/data-target-graceful-validation.spec.js`
- `npx playwright test tests/data-target-strict-validation.spec.js`
 
## GitHub Actions Integration
This project uses GitHub Actions for Continuous Integration (CI). The workflow is set up to run specific tests to validate the core functionality of the application.

# Running Specific Tests in GitHub Actions
In the GitHub Actions workflow, you can run only the main test (**data-target-graceful-validation.spec.js**) to ensure that the core objectives are being met. The other tests are supplementary and provide additional validation.

Here's how the test run is configured in the GitHub Actions workflow:
```
name: CI/CD Pipeline

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'

    - name: Install dependencies
      run: npm install

    - name: Install Playwright
      run: npx playwright install

    - name: List all tests
      run: npx playwright test --list

    - name: Run specific tests
      run: npx playwright test --grep 'data-target-graceful-validation'

    - name: Upload test results
      uses: actions/upload-artifact@v4
      with:
        name: test-results
        path: |
          test-results

```
## Explanation
 - **Purpose:** The GitHub Actions workflow is configured to run only the data-target-graceful-validation.spec.js test, as it is the primary test covering the main objectives of the project.
 - **Reasoning:** The other tests (data-analysis-report.spec.js and data-target-strict-validation.spec.js) are useful for additional validation but are not necessary for every CI run. By focusing on the main test, you ensure that the core functionality is always validated while keeping the CI process efficient.
