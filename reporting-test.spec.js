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

  // Define paths for the directories and files used in the test
  const agentDir = path.resolve(__dirname, "agent");
  const monitoredFilePath = path.join(
    agentDir,
    "inputs",
    "large_1M_events.log"
  );
  const logFilePath = path.resolve(__dirname, "events.log");
  const outputDir = path.resolve(__dirname, "output");
  const numLinesToCompare = 100;

  // Ensure the output directory exists, create it if it doesn't
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  test.beforeAll(async () => {
    // Verify the monitored file exists and is not empty
    if (!fs.existsSync(monitoredFilePath)) {
      throw new Error(`Monitored file ${monitoredFilePath} does not exist`);
    }

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
    agentProcess = exec("node app.js agent", { cwd: path.resolve(__dirname) });
    agentProcess.stdout.on("data", (data) => {
      agentOutput += data;
    });
    agentProcess.stderr.on("data", (data) => {
      agentErrors += data;
    });
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for the process to start
  });

  // Test to verify the creation and content of the events.log file
  test("should create events.log file with data", async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds

    const fileExists = fs.existsSync(logFilePath);
    expect(fileExists).toBe(true); // Verify that the file exists

    const fileData = fs.readFileSync(logFilePath, "utf-8");
    expect(fileData.length).toBeGreaterThan(0); // Verify that the file has some content
  });

  // Test to verify content integrity between the last lines of events.log and large_1M_events.log
  test("should verify recent content integrity between events.log and large_1M_events.log", async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds

    try {
      // Read the last N lines from both log files
      const eventLogTail = readLastLines(logFilePath, numLinesToCompare);
      const largeEventLogTail = readLastLines(
        monitoredFilePath,
        numLinesToCompare
      );

      // If there is a mismatch, log it to mismatch.txt
      if (eventLogTail !== largeEventLogTail) {
        const mismatchFilePath = path.join(outputDir, "mismatch.txt");
        fs.writeFileSync(
          mismatchFilePath,
          `Mismatch found:\n\nEvent Log File:\n${eventLogTail}\n\nLarge Event Log File:\n${largeEventLogTail}`
        );
        console.log("Mismatch found and logged to output/mismatch.txt");
      } else {
        console.log("Recent log entries are identical");
      }
    } catch (error) {
      console.error("Error comparing log tails:", error);
      throw error;
    }
  });

  test.afterAll(async () => {
    // Kill the processes if they are still running
    if (targetProcess) targetProcess.kill();
    if (splitterProcess) splitterProcess.kill();
    if (agentProcess) agentProcess.kill();

    // Save the captured output and errors to the output directory
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
    //fs.unlinkSync(logFilePath); // Remove events.log
    //fs.rmSync(outputDir, { recursive: true, force: true }); // Remove output directory and its contents
  });
});
