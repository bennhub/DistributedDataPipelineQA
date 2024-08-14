// Import necessary modules from Playwright, Node.js, and child_process
const { test, expect } = require("@playwright/test");
const fs = require("fs"); // File system module to interact with files
const path = require("path"); // Path module to handle and transform file paths
const { exec } = require("child_process"); // Module to execute shell commands

// Function to read the last N lines from a file
// This utility function reads a file from the given filePath,
// splits it into lines, and returns the last 'numLines' lines joined by a newline.
const readLastLines = (filePath, numLines) => {
  const fileData = fs.readFileSync(filePath, "utf-8");
  const lines = fileData.split("\n");
  return lines.slice(-numLines).join("\n");
};

// Main test suite to verify application startup and log file integrity
test.describe("App startup and verification", () => {
  let targetProcess, splitterProcess, agentProcess; // Variables to hold the processes for target, splitter, and agent applications
  let targetOutput = "", splitterOutput = "", agentOutput = ""; // Variables to accumulate the stdout output of the processes
  let targetErrors = "", splitterErrors = "", agentErrors = ""; // Variables to accumulate the stderr output of the processes

  // Define file paths and directories
  // Paths to the monitored file, the output log file, and the output directory
  const agentDir = path.resolve(__dirname, "agent");
  const monitoredFilePath = path.join(agentDir, "inputs", "large_1M_events.log");
  const logFilePath = path.resolve(__dirname, "events.log");
  const outputDir = path.resolve(__dirname, "output");
  const numLinesToCompare = 100; // Number of lines to compare between the log files

  // Ensure the output directory exists, create it if it doesn't
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Setup tasks before running tests (Arrange)
  test.beforeAll(async () => {
    // Verify the monitored file exists
    if (!fs.existsSync(monitoredFilePath)) {
      throw new Error(`Monitored file ${monitoredFilePath} does not exist`);
    }

    // Verify that the monitored file is not empty
    const fileData = fs.readFileSync(monitoredFilePath, "utf-8");
    if (fileData.length === 0) {
      throw new Error(`Monitored file ${monitoredFilePath} is empty`);
    }

    console.log(`Monitored file ${monitoredFilePath} is ready for testing`);

    // Start the 'target' process and capture its output and errors
    targetProcess = exec("node app.js target", {
      cwd: path.resolve(__dirname),
    });
    targetProcess.stdout.on("data", (data) => {
      targetOutput += data;
    });
    targetProcess.stderr.on("data", (data) => {
      targetErrors += data;
    });
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for the process to start

    // Start the 'splitter' process and capture its output and errors
    splitterProcess = exec("node app.js splitter", {
      cwd: path.resolve(__dirname),
    });
    splitterProcess.stdout.on("data", (data) => {
      splitterOutput += data;
    });
    splitterProcess.stderr.on("data", (data) => {
      splitterErrors += data;
    });
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for the process to start

    // Start the 'agent' process and capture its output and errors
    agentProcess = exec("node app.js agent", {
      cwd: path.resolve(__dirname),
    });
    agentProcess.stdout.on("data", (data) => {
      agentOutput += data;
    });
    agentProcess.stderr.on("data", (data) => {
      agentErrors += data;
    });
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for the process to start
  });

  // Test to verify that events.log file is created and contains data (Act & Assert)
  test("should create events.log file with data", async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Act: Wait for 5 seconds

    // Act: Check if the events.log file exists
    const fileExists = fs.existsSync(logFilePath);
    expect(fileExists).toBe(true); // Assert: Verify that the file exists

    // Act: Read the content of events.log and check if it has data
    const fileData = fs.readFileSync(logFilePath, "utf-8");
    expect(fileData.length).toBeGreaterThan(0); // Assert: Verify that the file has some content
  });

  // Test to compare the recent content of events.log with large_1M_events.log (Act & Assert)
  test("should verify recent content integrity between events.log and large_1M_events.log", async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Act: Wait for 5 seconds

    try {
      // Act: Read the last N lines from both files for comparison
      const eventLogTail = readLastLines(logFilePath, numLinesToCompare);
      const largeEventLogTail = readLastLines(monitoredFilePath, numLinesToCompare);

      // Act & Assert: Compare the tails of both files and fail the test if there's a mismatch
      expect(eventLogTail).toBe(largeEventLogTail); 

      if (eventLogTail === largeEventLogTail) {
        console.log("Recent log entries are identical");
      }
    } catch (error) {
      console.error("Error comparing log tails:", error);
      throw error; // Act: Rethrow the error to ensure test failure
    }
  });

  // Teardown tasks after tests are complete (Cleanup)
  test.afterAll(async () => {
    // Act: Kill all running processes
    if (targetProcess) targetProcess.kill();
    if (splitterProcess) splitterProcess.kill();
    if (agentProcess) agentProcess.kill();

    // Act: Save the outputs and errors from the processes to files for analysis
    fs.writeFileSync(path.join(outputDir, "target_output.log"), targetOutput);
    fs.writeFileSync(path.join(outputDir, "target_errors.log"), targetErrors);
    fs.writeFileSync(path.join(outputDir, "splitter_output.log"), splitterOutput);
    fs.writeFileSync(path.join(outputDir, "splitter_errors.log"), splitterErrors);
    fs.writeFileSync(path.join(outputDir, "agent_output.log"), agentOutput);
    fs.writeFileSync(path.join(outputDir, "agent_errors.log"), agentErrors);

    // Cleanup: Remove the events.log file and the output directory
    // Uncomment the following lines if you wish to clean up after the test run
    fs.unlinkSync(logFilePath); // Remove events.log
    fs.rmSync(outputDir, { recursive: true, force: true }); // Remove output directory and its contents
  });
});
