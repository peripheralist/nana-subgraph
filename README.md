# Juicebox Nana Subgraph

## Overview

The Nana subgraph indexes events from Juicebox nana fork contracts.

Contract names are defined in `config/template.json`

Contract addresses and startBlocks are defined in `config/<network>.json`

Subgraph data sources (contract definitions and event handlers) are defined in `subgraph.template.yaml`

`subgraph.yaml` is manually generated and should not be edited.

## Getting started

`yarn install` Install dependencies

`yarn global add @graphprotocol/graph-cli` (Only necessary for deploying)

## Config

`config/*.json` files define addresses and start blocks for contracts on specific networks. Usually, a contract's start block should be the block where that contract was deployed.

## Generating subgraph.yaml

Subgraphs are defined by a `subgraph.yaml` file, which is generated from `*.template.yaml` files. To make it easier to support multiple contract versions, there is a template file for each version as well as "shared".

Running `yarn prep <network>` will run `scripts/prepare.js` to construct a `subgraph.yaml` file for that network, using yaml template files and the contracts defined in `config/<network>.json`. 

The `prepare.js` script also performs a safety check for mismatches between the generated `subgraph.yaml` and the mapping files. Warnings will be shown if:
- a function is referenced in the `subgraph.yaml` that isn't defined in any mapping files
- a function defined in a mapping file isn't referenced in the `subgraph.yaml`

## Grafting

[Grafting](https://thegraph.com/docs/en/developing/creating-a-subgraph/#grafting-onto-existing-subgraphs) allows a new subgraph to use data from a pre-indexed subgraph version up to a specific block height, requiring less time for the new subgraph to index. 

A grafting configuration can be optionally defined in `config/graft.json`, like:
```
{
  "base": "<subgraph-id>", # Qm...
  "startBlock": <block-number>, # 123...
  "skip" <boolean> # ignore grafting config if true
},
```

See `config/graft.example.json` as an example.

> Note: Grafting is only supported on the hosted service and cannot be used in a subgraph deployed on the decentralized network

## Deploying

To deploy a new subgraph version, first prepare the subgraph for the intended network. This will:
- Run a sanity check beyond the integrated graph-cli checks that ensures there are no missing or extra mapping functions or dataSources
- Generate files with network-dependent variables `src/startBlocks.ts` and `src/contractAddresses.ts`
- Generate TS types for the schema defined in `schema.graphql`
- Compiles new gitignored `subgraph.yaml`

```bash
yarn prep:goerli
yarn prep:mainnet
```

Before deploying, you will need to authenticate with a deploy key for the given network (you'll only need to do this once).

```bash
graph auth --studio ${your-key}
```
Once authenticated:

```bash
graph deploy --studio <subgraph-name>
```

### Optional helper script:

```bash
yarn update:sepolia
yarn update:mainnet
```

Updates contract abis, addresses, and startBlocks
