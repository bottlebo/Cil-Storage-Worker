const fs = require('fs-ext');
const axios = require('axios');
const commandLineArgs = require('command-line-args');

const configs = require('./config.json');
const ApiClient = require('./apiClient');
let swapPath;
const blocksFile = 'blocks.dump';
const blockStateFile = 'blockstate.dump';

const utxosFile = 'utxos.dump';
const receiptsFile = 'receipts.dump';
const contractsFile = 'contracts.dump';
const deleteUtxosFile = 'deleteutxo.dump';
const removeBlockFile = 'removeblock.dump';

let pool = [];
const optionDefinitions = [
  {name: 'config', alias: 'c', type: String, multiple: false},
  {name: 'apiUser', alias: 'u', type: String, multiple: false},
  {name: 'apiPassword', alias: 'p', type: String, multiple: false}
];
//
(async () => {
  const options = commandLineArgs(optionDefinitions, {camelCase: true});

  const config = options.config ? configs[options.config] : configs['devel'];
  const _client = new ApiClient(options, config);

  swapPath = config['swapPath'];
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  //!!
  const blocks = read(`./${blocksFile}`);

  if (blocks && blocks.length) {
    pool['blocks'] = [...blocks];
  }
  while (true) {
    await sleep(1000);
    await load('blocks', blocksFile, _client.saveBlocks);
    await sleep(1000)
    await load('utxos', utxosFile, _client.saveUtxos);
    await sleep(1000)
    await load('blockstate', blockStateFile, _client.setBlockState);
    await sleep(1000)
    await load('receipts', receiptsFile, _client.saveReceipts);
    await sleep(1000)
    await load('contracts', contractsFile, _client.saveContracts);
    await sleep(1000)
    await load('removeBlocks', removeBlockFile, _client.removeBlocks);
    await sleep(1000)
    await load('deleteUtxos', deleteUtxosFile, _client.deleteUtxos);

  }
})();
//
function read(file) {
  let result = [];
  try {
    const fd = fs.openSync(`${file}`, 'r+');
    fs.flockSync(fd, 'ex');

    let data = fs.readFileSync(fd, 'utf8');
    let lines = data.split('\n');
    if (lines.length && lines.length > 1) {
      result = lines.slice(0, lines.length - 1);
      fs.ftruncateSync(fd);
    }
    fs.flockSync(fd, 'un');
    fs.closeSync(fd);
    return result;
  }
  catch (error) {
    return null;
  }
}
async function load(key, file, apiFunc) {
  let arrData;
  if (pool[key] && pool[key].length) {
    arrData = [...pool[key]];
  }
  else {
    arrData = read(`${swapPath}${file}`);
  }
  if (arrData && arrData.length) {
    try {
      const data = arrData.map(str => JSON.parse(str))
      await apiFunc(data)
      pool[key] = [];
    }
    catch (error) {
      push(key, arrData)
      if (error.message)
        console.log(error.message);
      else
        console.log(error);
    }
  }
}
function push(key, data) {
  pool[key] = [...data];
}
//
function shutdown() {
  if (pool['blocks'] && pool['blocks'].length) {
    fs.writeFileSync('./blocks.dump', pool['blocks'].join('\n') + '\n');
  }
  console.log('Shutting down');
  process.exit(1);
}
//
function sleep(delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay);
  });
}
