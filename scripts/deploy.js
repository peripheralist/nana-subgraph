const { exec } = require("child_process");
const { argv, stdout, exit } = require("process");
const { runYarnScript } = require("./util");
const chalk = require("chalk");

// example: `node deploy.js url api-key version network1 network2 network3 ...`

const args = argv.slice(2);

// use same apiKey and version for all subgraphs to deploy
const url = args.shift();
const apiKey = args.shift();
const version = args.shift();
const networks = args;

stdout.write(
  `Depoying...\nApi key: ${apiKey}\nVersion: ${version}\nNetworks: ${networks.join(
    ", "
  )}\n`
);

if (!apiKey) {
  throw new Error("Missing api key");
}

function deploySubgraph(network) {
  stdout.write(`Deploying ${network} ${version}...\n`);

  return new Promise((resolve, reject) => {
    exec(
      `graph deploy nana-${network} \
  --version-label ${version} \
  --node https://subgraphs.alchemy.com/api/subgraphs/deploy \
  --deploy-key ${apiKey} \
  --ipfs ${url}`,
      (error, stdout) => {
        if (error) {
          reject(error.message);
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
      await runYarnScript("generate", [network]);

      stdout.write(chalk.green(`Subgraph generated for ${network}\n\n`));
    } catch (e) {
      stdout.write(`${chalk.red("Error generating subgraph:")} ${network}\n\n`);
      exit(1);
    }

    try {
      await deploySubgraph(network);

      stdout.write(chalk.green(`Deployed ${network} ${version}\n\n`));
    } catch (e) {
      stdout.write(
        `${chalk.red("Error deploying subgraph:")} ${network} ${e}\n\n`
      );
      errors.push(chalk.red(`Error deploying ${network}`));
    }
  }

  stdout.write(errors.length ? errors.join("\n") : "Completed with no errors");
}

main();
