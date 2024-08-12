const { test, expect } = require("@playwright/test");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Function to read the last N lines from a file
const readLastLines = (filePath, numLines) => {
  const fileData = fs.readFileSync(filePath, "utf-8");
  const lines = fileData.split("\n");
  return lines.slice(-numLines).join("\n");
};

test.describe("App startup and verification", () => {
  let targetProcess, splitterProcess, agentProcess;
  let targetOutput = "",
    splitterOutput = "",
    agentOutput = "";
  let targetErrors = "",
    splitterErrors = "",
    agentErrors = "";

  // Define file paths and directories
  const agentDir = path.resolve(__dirname, "../agent");
  const monitoredFilePath = path.join(
    agentDir,
    "inputs",
    "large_1M_events.log"
  );
  const logFilePath = path.resolve(__dirname, "../events.log");
  const outputDir = path.resolve(__dirname, "../output");
  const numLinesToCompare = 100;

  // Ensure the output directory exists, create if not
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Setup tasks before running tests
  test.beforeAll(async () => {
    // Check if the monitored file exists
    if (!fs.existsSync(monitoredFilePath)) {
      throw new Error(`Monitored file ${monitoredFilePath} does not exist`);
    }

    // Verify that the monitored file is not empty
    const fileData = fs.readFileSync(monitoredFilePath, "utf-8");
    if (fileData.length === 0) {
      throw new Error(`Monitored file ${monitoredFilePath} is empty`);
    }

    console.log(`Monitored file ${monitoredFilePath} is ready for testing`);

    // Start the target application and capture its output
    targetProcess = exec("node app.js target", {
      cwd: path.resolve(__dirname, '../'),
    });
    targetProcess.stdout.on("data", (data) => {
      targetOutput += data;
    });
    targetProcess.stderr.on("data", (data) => {
      targetErrors += data;
    });
    // Wait for the target application to initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Start the splitter application and capture its output
    splitterProcess = exec("node app.js splitter", {
      cwd: path.resolve(__dirname, '../'),
    });
    splitterProcess.stdout.on("data", (data) => {
      splitterOutput += data;
    });
    splitterProcess.stderr.on("data", (data) => {
      splitterErrors += data;
    });
    // Wait for the splitter application to initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Start the agent application and capture its output
    agentProcess = exec("node app.js agent", { cwd: path.resolve(__dirname, '../'), });
    agentProcess.stdout.on("data", (data) => {
      agentOutput += data;
    });
    agentProcess.stderr.on("data", (data) => {
      agentErrors += data;
    });
    // Wait for the agent application to initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  // Test to verify that events.log file is created and contains data
  test("should create events.log file with data", async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds

    // Check if the events.log file exists
    const fileExists = fs.existsSync(logFilePath);
    expect(fileExists).toBe(true); // Assert that the file exists

    // Read the content of events.log and check if it has data
    const fileData = fs.readFileSync(logFilePath, "utf-8");
    expect(fileData.length).toBeGreaterThan(0); // Assert that the file has some content
  });

  // Test to compare the recent content of events.log with large_1M_events.log
  test("should verify recent content integrity between events.log and large_1M_events.log", async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds

    try {
      // Read the last N lines from both files for comparison
      const eventLogTail = readLastLines(logFilePath, numLinesToCompare);
      const largeEventLogTail = readLastLines(
        monitoredFilePath,
        numLinesToCompare
      );

      // Compare the tails of both files
      expect(eventLogTail).toBe(largeEventLogTail); // Explicitly fail the test if there's a mismatch

      if (eventLogTail === largeEventLogTail) {
        console.log("Recent log entries are identical");
      }
    } catch (error) {
      console.error("Error comparing log tails:", error);
      throw error; // Rethrow the error to ensure test failure
    }
  });

  // Teardown tasks after tests are complete
  test.afterAll(async () => {
    // Kill all running processes
    if (targetProcess) targetProcess.kill();
    if (splitterProcess) targetProcess.kill();
    if (agentProcess) targetProcess.kill();

    // Save the outputs and errors from the processes to files for analysis
    fs.writeFileSync(path.join(outputDir, "target_output.log"), targetOutput);
    fs.writeFileSync(path.join(outputDir, "target_errors.log"), targetErrors);
    fs.writeFileSync(
      path.join(outputDir, "splitter_output.log"),
      splitterOutput
    );
    fs.writeFileSync(
      path.join(outputDir, "splitter_errors.log"),
      splitterErrors
    );
    fs.writeFileSync(path.join(outputDir, "agent_output.log"), agentOutput);
    fs.writeFileSync(path.join(outputDir, "agent_errors.log"), agentErrors);

    // Cleanup: Remove the events.log file and the output directory
    // Commented out to retain artifacts as per the objectives
    // Uncomment the following lines if you wish to clean up after the test run
    fs.unlinkSync(logFilePath); // Remove events.log
    fs.rmSync(outputDir, { recursive: true, force: true }); // Remove output directory and its contents
    
  });
});
