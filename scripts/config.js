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

  stdout.write(
    `Updating contract addresses and start blocks for network: ${chalk.cyan.bold(
      network
    )}\n`
  );

  const testnetSuffix = () => {
    return [
      "sepolia",
      "arbitrum-sepolia",
      "base-sepolia",
      "optimism-sepolia",
    ].includes(network)
      ? "-testnet"
      : "";
  };

  const urlNetwork = network.replace("-", "_");

  const baseUrl = "https://raw.githubusercontent.com";
  const nanaCoreGithubUrl = (name) =>
    `${baseUrl}/Bananapus/nana-core/main/deployments/nana-core${testnetSuffix()}/${urlNetwork}/${name}.json`;
  const nana721GithubUrl = (name) =>
    `${baseUrl}/Bananapus/nana-721-hook/main/deployments/nana-721-hook${testnetSuffix()}/${urlNetwork}/${name}.json`;
  const bannyverseGithubUrl = (name) =>
    `${baseUrl}/mejango/banny-looks/main/deployments/bannyverse-core${testnetSuffix()}/${urlNetwork}/${name}.json`;
  const revGithubUrl = (name) =>
    `${baseUrl}/rev-net/revnet-core/main/deployments/revnet-core${testnetSuffix()}/${urlNetwork}/${name}.json`;

  const configTemplate = JSON.parse(fs.readFileSync("config/template.json"));

  // init updated config object
  const config = {
    network,
  };

  // Sequential promises to maintain sort
  for (const name of configTemplate.sort()) {
    let url;

    // determine which url to use. crude but effective :cry:
    if (name.includes("banny")) {
      url = bannyverseGithubUrl(name.replace("b", "B"));
    } else if (name.includes("721")) {
      url = nana721GithubUrl(name.replace("jb", "JB"));
    } else if (name.includes("rev")) {
      url = revGithubUrl(name.replace("rev", "REV"));
    } else {
      url = nanaCoreGithubUrl(name.replace("jb", "JB"));
    }

    // read deployment file from github
    await axios
      .get(url, {
        headers: { Accept: "application/vnd.github.object+json" },
      })
      .then((res) => {
        const { address, abi, contractName } = res.data;
        // const { blockNumber: startBlock } = receipt; // TODO receipt gone from data

        stdout.write(
          `✅ ${chalk.bold(
            chalk.greenBright(contractName)
          )}\n  Address: ${address}\n  URL: ${url}\n`
        );

        // update abi
        fs.writeFileSync(
          `abis/${contractName}.json`,
          JSON.stringify(abi, null, 2)
        );

        // update config using deployment file
        config[name] = {
          name: contractName,
          address,
          startBlock: res.data.receipt?.blockNumber ?? 0,
        };
      })
      .catch((e) => {
        stdout.write(`Update failed for ${name}\n Using url: "${url}"\n`);
        stdout.write(e);
        exit(1);
      });
  }

  fs.writeFileSync(`config/${network}.json`, JSON.stringify(config, null, 2));

  stdout.write(chalk.green("Success\n"));
}

main();
