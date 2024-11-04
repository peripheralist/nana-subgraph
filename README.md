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

## Generating network config

`config/<network>.json` files define addresses and start blocks for contracts on specific networks. Usually, a contract's start block should be the block where that contract was deployed.

Run `yarn config:<network>` to generate a config file for that network, with updated contract addresses and startBlocks.

## Generating subgraph.yaml

Subgraphs are defined by a `subgraph.yaml` file, which is generated from `*.template.yaml` files.

Running `yarn prep:<network>` will run `scripts/prepare.js` to construct a `subgraph.yaml` file for that network, using yaml template files and the contracts defined in `config/<network>.json`. 

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

> Note: Grafting compatibility may be dependent on the network or subgraph indexing client.

## Deploying
```
A subgraph can be deployed once a `subgraph.yaml` file is created. There may only be one `subgraph.yaml` at a time, so you'll need to re-generate the file for each network if deploying to multiple networks.

Check with the subgraph indexer service for instructions on deploying using your `subgraph.yaml`.