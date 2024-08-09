const { test, expect } = require('@playwright/test'); // Import Playwright test and expect functions
const fs = require('fs'); // Import the filesystem module for file operations
const path = require('path'); // Import the path module for handling file paths
const { exec } = require('child_process'); // Import exec function for running shell commands

// Define paths for the log and report files
const logPath = path.join(__dirname, 'events.log');
const reportPath = path.join(__dirname, 'data_analysis_report.txt');

// Declare variables to hold references to started processes
let targetProcess, splitterProcess, agentProcess;

// Utility function to read and parse the log file
const readAndParseLogFile = () => {
  // Check if the log file exists
  if (!fs.existsSync(logPath)) {
    console.error(`Log file does not exist at: ${logPath}`); // Log an error if the file is missing
    expect(true).toBe(false); // Fail the test if the log file is missing
    return []; // Return an empty array
  }

  // Read the log file content and split it into lines
  const logContent = fs.readFileSync(logPath, 'utf-8');
  return logContent.split('\n').filter(line => line.trim().length > 0); // Filter out empty lines
};

// Utility function to write a report file
const writeReportFile = (data) => {
  // Format the data for the report, prefixing each line with "Line X: "
  const reportContent = data.map((entry, index) => `Line ${index + 1}: ${entry}`).join('\n');
  fs.writeFileSync(reportPath, reportContent, 'utf-8'); // Write the formatted data to the report file
};

// Utility function to ensure files exist or do not exist as expected
const ensureFilesExist = (paths) => {
  paths.forEach(({ path, shouldExist }) => {
    // Check if the file existence matches the expected condition
    if (fs.existsSync(path) !== shouldExist) {
      console.error(`${shouldExist ? 'Missing' : 'Unexpectedly existing'} file: ${path}`); // Log an error if the file status is incorrect
      expect(true).toBe(false); // Fail the test if the file status is incorrect
    }
  });
};

// Function to capture and verify the existence and content of the log and report files
const captureAndVerifyOutputs = async () => {
  // Log the content of the log and report files if they exist
  console.log(`Log file content:\n${fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf-8') : 'Not found'}`);
  console.log(`Report file content:\n${fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf-8') : 'Not found'}`);

  // Ensure that both the log and report files exist
  ensureFilesExist([
    { path: logPath, shouldExist: true },
    { path: reportPath, shouldExist: true }
  ]);
};

// Hook to set up the environment before all tests
test.beforeAll(async () => {
  console.log('Setting up the environment...');
  
  try {
    // Start the services using the exec function
    targetProcess = exec('node app.js target', { stdio: 'inherit' });
    splitterProcess = exec('node app.js splitter', { stdio: 'inherit' });
    agentProcess = exec('node app.js agent', { stdio: 'inherit' });

    // Wait for 5 seconds to allow the services to initialize and generate the log file
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Environment setup complete.');
  } catch (error) {
    console.error('Setup failed:', error); // Log an error if setup fails
    expect(true).toBe(false); // Fail the test suite if setup fails
  }
});

// Hook to clean up the environment after all tests
test.afterAll(async () => {
  console.log('Cleaning up the environment...');

  try {
    // Stop the services if they are running
    if (targetProcess) targetProcess.kill('SIGTERM');
    if (splitterProcess) splitterProcess.kill('SIGTERM');
    if (agentProcess) agentProcess.kill('SIGTERM');

    // Remove the log and report files if they exist
    [logPath, reportPath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Delete the file
        console.log(`Removed file at: ${filePath}`);
      }
    });

    console.log('Environment cleanup complete.');
  } catch (error) {
    console.error('Teardown failed:', error); // Log an error if cleanup fails
    expect(true).toBe(false); // Fail the test suite if cleanup fails
  }
});

// Group of tests related to data analysis and validation
test.describe('Data Analysis and Validation Tests', () => {

  // Test case: Analyze data from the log file and generate a report
  test('Analyze data from events.log and generate a report', async () => {
    // Arrange: Read and parse the log file
    const logLines = readAndParseLogFile();

    // Act: Generate the report file based on parsed log data
    writeReportFile(logLines);

    console.log(`Data analysis report generated at: ${reportPath}`);

    // Assert: Verify that the log and report files exist and are correct
    await captureAndVerifyOutputs();
  });

  // Test case: Compare the data analysis report with the log file
  test('Compare data analysis report with events.log', async () => {
    // Arrange: Ensure the log file and report file exist
    ensureFilesExist([
      { path: logPath, shouldExist: true },
      { path: reportPath, shouldExist: true }
    ]);

    // Act: Read and parse both the log file and report file
    const logData = readAndParseLogFile();
    const reportData = fs.readFileSync(reportPath, 'utf-8').split('\n').filter(line => line.trim().length > 0);

    // Create a set from the log data for quick lookup
    const logDataSet = new Set(logData);
    
    // Compare each line in the report file with the log data
    reportData.forEach(line => {
      // Remove the "Line X: " prefix to compare content only
      const content = line.replace(/Line \d+: /, '');
      // Check if the content is present in the log data set
      if (!logDataSet.has(content)) {
        console.log(`Mismatch found: ${line}`); // Log a mismatch if found
        expect(true).toBe(false); // Fail the test if there is a mismatch
      }
    });

    console.log('Validation complete.');
    expect(true).toBe(true); // Ensure the test passes if no mismatches are found

    // Assert: Verify that the log and report files exist and are correct
    await captureAndVerifyOutputs();
  });

});
