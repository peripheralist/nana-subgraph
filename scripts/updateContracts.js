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
    `${baseUrl}/Bananapus/nana-core/main/deployments/nana-core-testnet/${network}/${name}.json`;
  const nana721GithubUrl = (name) =>
    `${baseUrl}/Bananapus/nana-721-hook/main/deployments/nana-721-hook-testnet/${network}/${name}.json`;
  const bannyVerseSubRoute = () => {
    if (["sepolia"].includes(network)) return "bannyverse-core-testnet";
    return "bannyverse-core";
  };
  const bannyverseGithubUrl = (name) =>
    `${baseUrl}/mejango/bannyverse-core/main/deployments/${bannyVerseSubRoute()}/${network}/${name}.json`;

  const configTemplate = JSON.parse(fs.readFileSync("config/template.json"));

  // init updated config object
  const config = {
    network,
  };

  // Sequential promises to maintain sort
  for (const name of configTemplate["contracts"].sort()) {
    let url;

    if (name.includes("banny")) {
      url = bannyverseGithubUrl(name.replace("b", "B"));
    } else if (name.includes("721")) {
      url = nana721GithubUrl(name.replace("jb", "JB"));
    } else {
      url = nanaCoreGithubUrl(name.replace("jb", "JB"));
    } // determine which url to use. crude but effective

    // read deployment file from github
    await axios
      .get(url, {
        headers: { Accept: "application/vnd.github.object+json" },
      })
      .then((res) => {
        const { address, receipt, abi, contractName } = res.data;
        const { blockNumber: startBlock } = receipt;

        // update abi
        fs.writeFileSync(
          `abis/${contractName}.json`,
          JSON.stringify(abi, null, 2)
        );

        // update config using deployment file
        config[name] = {
          name: contractName,
          address,
          startBlock,
        };
      })
      .catch((e) => {
        stdout.write(`Update failed for ${name}\n Using url: ${url}\n`);
        stdout.write(e);
        exit(1);
      });
  }

  fs.writeFileSync(`config/${network}.json`, JSON.stringify(config, null, 2));

  stdout.write(chalk.green("Success\n"));
}

main();
