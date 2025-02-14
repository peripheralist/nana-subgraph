const { spawn } = require("child_process");
const { stdout } = process;
const chalk = require("chalk");

function runYarnScript(scriptName, args = [], verbose) {
  return new Promise((resolve, reject) => {
    const yarn = spawn("yarn", ["run", scriptName, ...args]);

    if (verbose) {
      yarn.stdout.on("data", (data) => {
        stdout.write(data);
      });

      yarn.stderr.on("data", (data) => {
        stdout.write(data);
      });
    }

    yarn.stderr.on("error", (data) => {
      stdout.write(`${chalk.red("Yarn script error:")} ${data}`);
    });

    yarn.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`Yarn script "${scriptName}" failed with code ${code}`)
        );
        return;
      }
      resolve();
    });
  });
}

module.exports = { runYarnScript };
