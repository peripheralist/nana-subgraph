const { exec } = require("child_process");
const { argv, stdout, exit } = require("process");
const { runYarnScript } = require("./util");
const chalk = require("chalk");

// example: `node deploy.js node-url ipfs-url api-key version network1 network2 network3 ...`

const args = argv.slice(2);

// use same apiKey and version for all subgraphs to deploy
const nodeUrl = args.shift();
const ipfsUrl = args.shift();
const apiKey = args.shift();
const version = args.shift();
const networks = args;

stdout.write(chalk.bold(`\nDeploying ${version}:\n- ${networks.join("\n- ")}`));

stdout.write(
  chalk.grey(`\n\nNode url: ${nodeUrl}
IPFS url: ${ipfsUrl}
Api key: ${apiKey}`)
);

async function generateSubgraph(network) {
  await runYarnScript("generate", [network]);
}

async function deploySubgraph(network) {
  return new Promise((resolve, reject) => {
    exec(
      `graph deploy ${network} \
  --version-label ${version} \
  --node ${nodeUrl} \
  --deploy-key ${apiKey} \
  --ipfs ${ipfsUrl}`,
      (error, stdout, stderr) => {
        if (error) {
          reject(error.message);
          return;
        }

        const errorMessages = ["failed", "error"];
        const failureMessage = stderr
          .split("\n")
          .filter((line) =>
            errorMessages.some((err) => line.toLowerCase().includes(err))
          )
          .join("\n");

        if (failureMessage && failureMessage.length) {
          reject(failureMessage);
          return;
        }

        resolve(stdout);
      }
    );
  });
}

async function main() {
  const errors = [];

  for (const network of networks) {
    try {
      stdout.write(`\n\nGenerating ${network} subgraph...`);
      await generateSubgraph(network);
      stdout.write(chalk.green(`\nGenerated ${network} subgraph`));
    } catch (e) {
      stdout.write(`\n${chalk.red("Error generating subgraph:")} ${network}`);
      exit(1);
    }

    try {
      stdout.write(`\nDeploying ${network} ${version}...`);
      await deploySubgraph(network);
      process.stdout.write(chalk.green(`\nDeployed ${network} ${version}`));
    } catch (e) {
      stdout.write(`\n${chalk.red(`Error deploying ${network}: ${e}`)}`);
      errors.push(chalk.red(`Error deploying ${network}`));
    }
  }

  stdout.write(
    errors.length ? `\n\n${errors.join("\n")}` : "\n\nCompleted with no errors"
  );
}

main();
