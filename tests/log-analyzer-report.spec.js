const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Define paths for log files and report files
const paths = {
  log: path.join(__dirname, '../events.log'), // Points to the root directory
  report: path.join(__dirname, '../data_analysis_report.txt'), // Points to the root directory
};

// Declare variables to hold references to started processes
let processes = {};

const readAndParseLogFile = () => {
  if (!fs.existsSync(paths.log)) {
    console.error(`Log file does not exist at: ${paths.log}`);
    expect(true).toBe(false);
    return [];
  }
  return fs.readFileSync(paths.log, 'utf-8').split('\n').filter(line => line.trim());
};

const writeReportFile = (data) => {
  const reportContent = data.map((entry, index) => `Line ${index + 1}: ${entry}`).join('\n');
  fs.writeFileSync(paths.report, reportContent, 'utf-8');
};

const ensureFilesExist = (files) => {
  files.forEach(({ path, shouldExist }) => {
    const exists = fs.existsSync(path);
    if (exists !== shouldExist) {
      console.error(`${shouldExist ? 'Missing' : 'Unexpectedly existing'} file: ${path}`);
      expect(true).toBe(false);
    }
  });
};

test.beforeAll(async () => {
  console.log('Setting up the environment...');
  try {
    // Start the processes but do not capture their output
    processes.target = exec('node app.js target');
    processes.splitter = exec('node app.js splitter');
    processes.agent = exec('node app.js agent');

    // Wait for applications to initialize
    await new Promise(resolve => setTimeout(resolve, 8000)); // Adjust delay as needed

    console.log('Environment setup complete.');
  } catch (error) {
    console.error('Setup failed:', error);
    expect(true).toBe(false);
  }
});

test.afterAll(async () => {
  console.log('Cleaning up the environment...');
  try {
    // Stop processes
    for (const process of Object.values(processes)) {
      if (process) process.kill('SIGTERM');
    }

    // Remove generated files except for the data_analysis_report.txt
    const filesToRemove = [
      paths.log, // Remove events.log
    ];

    filesToRemove.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Removed file at: ${filePath}`);
      } else {
        console.log(`File not found: ${filePath}`);
      }
    });

    console.log('Environment cleanup complete.');
  } catch (error) {
    console.error('Teardown failed:', error);
    expect(true).toBe(false);
  }
});

test.describe('Data Analysis and Validation Tests', () => {
  test('Analyze data from events.log and generate a report', async () => {
    const logLines = readAndParseLogFile();
    writeReportFile(logLines);
    console.log(`Data analysis report generated at: ${paths.report}`);
    ensureFilesExist([
      { path: paths.log, shouldExist: true },
      { path: paths.report, shouldExist: true }
    ]);
  });

  test('Compare data analysis report with events.log', async () => {
    ensureFilesExist([
      { path: paths.log, shouldExist: true },
      { path: paths.report, shouldExist: true }
    ]);

    const logData = readAndParseLogFile();
    const reportData = fs.readFileSync(paths.report, 'utf-8').split('\n').filter(line => line.trim());

    const logDataSet = new Set(logData);

    reportData.forEach(line => {
      const content = line.replace(/Line \d+: /, '');
      if (!logDataSet.has(content)) {
        console.log(`Mismatch found: ${line}`);
        expect(true).toBe(false);
      }
    });

    console.log('Validation complete.');
    expect(true).toBe(true);
  });
});
