// Import necessary modules from Playwright, Node.js, and child_process
const { test, expect } = require('@playwright/test');
const fs = require('fs'); // File system module to interact with files
const path = require('path'); // Path module to handle and transform file paths
const { exec } = require('child_process'); // Module to execute shell commands

// Define paths for important files used in the tests
const paths = {
  log: path.join(__dirname, 'events.log'), // Path to the events log file in the current directory
  report: path.join(__dirname, 'data_analysis_report.txt'), // Path to the report file in the current directory
};

// Declare an object to hold references to the processes started during the tests
let processes = {};

// Function to read and parse the log file
const readAndParseLogFile = () => {
  // Check if the log file exists
  if (!fs.existsSync(paths.log)) {
    console.error(`Log file does not exist at: ${paths.log}`);
    expect(true).toBe(false); // Fail the test if the file doesn't exist
    return []; // Return an empty array if the file is missing
  }
  // Read the file content, split it by new lines, and filter out empty lines
  return fs.readFileSync(paths.log, 'utf-8').split('\n').filter(line => line.trim());
};

// Function to write data into the report file
const writeReportFile = (data) => {
  // Prepare the content for the report by prefixing each line with its line number
  const reportContent = data.map((entry, index) => `Line ${index + 1}: ${entry}`).join('\n');
  // Write the prepared content to the report file
  fs.writeFileSync(paths.report, reportContent, 'utf-8');
};

// Function to ensure that specified files exist or do not exist
const ensureFilesExist = (files) => {
  files.forEach(({ path, shouldExist }) => {
    // Check if the file exists
    const exists = fs.existsSync(path);
    // If the existence status doesn't match the expected, log an error and fail the test
    if (exists !== shouldExist) {
      console.error(`${shouldExist ? 'Missing' : 'Unexpectedly existing'} file: ${path}`);
      expect(true).toBe(false); // Fail the test
    }
  });
};

// Before all tests, set up the environment
test.beforeAll(async () => {
  console.log('Setting up the environment...');
  try {
    // Start the necessary processes for the test environment
    processes.target = exec('node app.js target'); // Start the 'target' process
    processes.splitter = exec('node app.js splitter'); // Start the 'splitter' process
    processes.agent = exec('node app.js agent'); // Start the 'agent' process

    // Wait for the applications to initialize properly (adjust the delay as needed)
    await new Promise(resolve => setTimeout(resolve, 8000));

    console.log('Environment setup complete.');
  } catch (error) {
    // Log any error that occurs during setup and fail the test
    console.error('Setup failed:', error);
    expect(true).toBe(false); // Fail the test
  }
});

// After all tests, clean up the environment
test.afterAll(async () => {
  console.log('Cleaning up the environment...');
  try {
    // Stop all processes that were started during setup
    for (const process of Object.values(processes)) {
      if (process) process.kill('SIGTERM'); // Terminate the process with SIGTERM signal
    }

    // List of files to be removed during cleanup
    const filesToRemove = [
      paths.log, // Remove the events.log file
    ];

    // Remove each file in the list if it exists
    filesToRemove.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Delete the file
        console.log(`Removed file at: ${filePath}`);
      } else {
        console.log(`File not found: ${filePath}`);
      }
    });

    console.log('Environment cleanup complete.');
  } catch (error) {
    // Log any error that occurs during cleanup and fail the test
    console.error('Teardown failed:', error);
    expect(true).toBe(false); // Fail the test
  }
});

// Describe a set of tests for data analysis and validation
test.describe('Data Analysis and Validation Tests', () => {

  // First test: Analyze data from events.log and generate a report
  test('Analyze data from events.log and generate a report', async () => {
    // ARRANGE: Ensure that necessary files are present
    const logLines = readAndParseLogFile(); // Read the log file data

    // ACT: Write the log data into the report file
    writeReportFile(logLines);
    console.log(`Data analysis report generated at: ${paths.report}`);
    
    // ASSERT: Check that both the log file and the report file exist
    ensureFilesExist([
      { path: paths.log, shouldExist: true }, // events.log should exist
      { path: paths.report, shouldExist: true } // data_analysis_report.txt should exist
    ]);
  });

  // Second test: Compare data analysis report with events.log
  test('Compare data analysis report with events.log', async () => {
    // ARRANGE: Ensure that the log file and report file exist
    ensureFilesExist([
      { path: paths.log, shouldExist: true }, // events.log should exist
      { path: paths.report, shouldExist: true } // data_analysis_report.txt should exist
    ]);

    // ACT: Read and parse both the log file and the report file
    const logData = readAndParseLogFile();
    const reportData = fs.readFileSync(paths.report, 'utf-8').split('\n').filter(line => line.trim());

    // Convert log data into a set for efficient lookup
    const logDataSet = new Set(logData);

    // ASSERT: Compare each line in the report with the log data
    reportData.forEach(line => {
      const content = line.replace(/Line \d+: /, ''); // Remove line number prefix from report
      if (!logDataSet.has(content)) {
        // If a line in the report does not match the log data, log the mismatch and fail the test
        console.log(`Mismatch found: ${line}`);
        expect(true).toBe(false); // Fail the test
      }
    });

    // If no mismatches are found, the validation is complete
    console.log('Validation complete.');
    expect(true).toBe(true); // Pass the test
  });
});
