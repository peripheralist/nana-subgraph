const { default: axios } = require("axios");
const chalk = require("chalk");
const fs = require("fs");

const { stdout, exit } = process;

async function main() {
  const network = process.argv.slice(2)[0];

  if (!network) {
    stdout.write(chalk.red("Network undefined\n"));
    exit(1);
  }

  stdout.write(`Updating contracts for network: ${chalk.cyan.bold(network)}\n`);

  const baseUrl = "https://raw.githubusercontent.com";
  const nanaCoreGithubUrl = (name) =>
    `${baseUrl}/Bananapus/nana-core/main/deployments/nana-core/${network}/${name}.json`;
  const nana721GithubUrl = (name) =>
    `${baseUrl}/Bananapus/nana-721-hook/main/deployments/nana-721-hook/${network}/${name}.json`;

  const configTemplate = JSON.parse(fs.readFileSync("config/template.json"));

  // init updated config object
  const config = {
    network,
  };

  // Sequential promises to maintain sort
  for (const name of configTemplate["contracts"].sort()) {
    const url = (name.includes("721") ? nana721GithubUrl : nanaCoreGithubUrl)(
      name.replace("jb", "JB")
    ); // determine which url to use. crude but effective

    // read deployment file from github
    await axios
      .get(url, {
        headers: { Accept: "application/vnd.github.object+json" },
      })
      .then((res) => {
        const { address, receipt, abi, contractName } = res.data;
        const { blockNumber: startBlock } = receipt;

        // update abi
        fs.writeFileSync(`abis/${contractName}.json`, JSON.stringify(abi));

        // update config using deployment file
        config[name] = {
          address,
          startBlock,
        };
      })
      .catch((e) => {
        stdout.write(`Update failed for ${name}\n`);
        stdout.write(e);
        exit(1);
      });
  }

  fs.writeFileSync(`config/${network}.json`, JSON.stringify(config));

  stdout.write(chalk.green("Success\n"));
}

main();
