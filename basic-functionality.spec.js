const { test, expect } = require('@playwright/test');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

test.describe('App startup and verification', () => {
  // Declare variables for managing processes and capturing output
  let targetProcess, splitterProcess, agentProcess;
  let targetOutput = '', splitterOutput = '', agentOutput = '';
  let targetErrors = '', splitterErrors = '', agentErrors = '';

  // Define paths for configuration and log files
  const agentDir = path.resolve(__dirname, 'agent'); // Path to the directory containing agent's configuration and monitored files
  const monitoredFilePath = path.join(agentDir, 'inputs', 'large_1M_events.log'); // Path to the large file monitored by the agent
  const logFilePath = path.resolve(__dirname, 'events.log'); // Path to the file where the target should write data
  const outputDir = path.resolve(__dirname, 'output'); // Directory to store captured output and error logs

  // Ensure the output directory exists, create if not
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  test.beforeAll(async () => {
    // Verify that the monitored file exists and is not empty
    if (!fs.existsSync(monitoredFilePath)) {
      // Fail the test if the monitored file does not exist
      throw new Error(`Monitored file ${monitoredFilePath} does not exist`);
    }

    const fileData = fs.readFileSync(monitoredFilePath, 'utf-8');
    if (fileData.length === 0) {
      // Fail the test if the monitored file is empty
      throw new Error(`Monitored file ${monitoredFilePath} is empty`);
    }

    console.log(`Monitored file ${monitoredFilePath} is ready for testing`);

    // Start the target application and capture its output and errors
    targetProcess = exec('node app.js target', { cwd: path.resolve(__dirname) });
    targetProcess.stdout.on('data', (data) => { targetOutput += data; });
    targetProcess.stderr.on('data', (data) => { targetErrors += data; });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds to ensure the target app has started

    // Start the splitter application and capture its output and errors
    splitterProcess = exec('node app.js splitter', { cwd: path.resolve(__dirname) });
    splitterProcess.stdout.on('data', (data) => { splitterOutput += data; });
    splitterProcess.stderr.on('data', (data) => { splitterErrors += data; });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds to ensure the splitter app has started

    // Start the agent application and capture its output and errors
    agentProcess = exec('node app.js agent', { cwd: path.resolve(__dirname) });
    agentProcess.stdout.on('data', (data) => { agentOutput += data; });
    agentProcess.stderr.on('data', (data) => { agentErrors += data; });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds to ensure the agent app has started
  });

  test('should create events.log file with data', async () => {
    // Allow some time for the target application to process the data and write to the events.log file
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds

    // Check if the events.log file exists
    const fileExists = fs.existsSync(logFilePath);
    expect(fileExists).toBe(true); // Verify that the file exists

    // Check if the events.log file contains data
    const fileData = fs.readFileSync(logFilePath, 'utf-8');
    expect(fileData.length).toBeGreaterThan(0); // Verify that the file has some content
  });

  test.afterAll(async () => {
    // Terminate all running processes after tests are complete
    if (targetProcess) targetProcess.kill(); // Kill the target process
    if (splitterProcess) splitterProcess.kill(); // Kill the splitter process
    if (agentProcess) agentProcess.kill(); // Kill the agent process

    // Write captured outputs and errors to files for further analysis
    fs.writeFileSync(path.join(outputDir, 'target_output.log'), targetOutput); // Save target app's output
    fs.writeFileSync(path.join(outputDir, 'target_errors.log'), targetErrors); // Save target app's errors
    fs.writeFileSync(path.join(outputDir, 'splitter_output.log'), splitterOutput); // Save splitter app's output
    fs.writeFileSync(path.join(outputDir, 'splitter_errors.log'), splitterErrors); // Save splitter app's errors
    fs.writeFileSync(path.join(outputDir, 'agent_output.log'), agentOutput); // Save agent app's output
    fs.writeFileSync(path.join(outputDir, 'agent_errors.log'), agentErrors); // Save agent app's errors
  });
});
