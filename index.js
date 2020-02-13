const fs = require('fs-ext');
const commandLineArgs = require('command-line-args');
const configs = require('./config.json');
const ApiClient = require('./apiClient');
let swapPath;
const dataExt = 'dump';

const optionDefinitions = [
  {name: 'config', alias: 'c', type: String, multiple: false},
  {name: 'apiUser', alias: 'u', type: String, multiple: false},
  {name: 'apiPassword', alias: 'p', type: String, multiple: false}
];
const options = commandLineArgs(optionDefinitions, {camelCase: true});

const config = options.config ? configs[options.config] : configs['devel'];
swapPath = config['swapPath'];

const _client = new ApiClient(options, config);

let pool = [];
const regex = /^[0-9]+\_(\w+)\./;
const actions = [
  {key: 'blocks', apiCall: _client.saveBlocks},
  {key: 'utxos', apiCall: _client.saveUtxos},
  {key: 'blockstate', apiCall: _client.setBlockState},
  {key: 'receipts', apiCall: _client.saveReceipts},
  {key: 'contracts', apiCall: _client.saveContracts},
  {key: 'removeblock', apiCall: _client.removeBlocks},
  {key: 'deleteutxo', apiCall: _client.deleteUtxos},
];
//
(async () => {
  // process.on('SIGINT', shutdown);
  // process.on('SIGTERM', shutdown);
  while (true) {
    await doWork();
    await sleep(1000)
  }
})();

async function doWork() {
  const files = fs.readdirSync(swapPath);
  const dataFiles = files.filter(file => isData(file));
  for (const file of dataFiles) {
    const apiCall = actions.find(e => e.key === file.match(regex)[1]).apiCall;
    try {
      const fullFile = `${swapPath}${file}`;
      const data = fs.readFileSync(fullFile, 'utf8')
      let lines = data.split('\n');
      if (lines.length && lines.length > 0) {
        await apiCall(lines.map(str => JSON.parse(str)));
        fs.unlinkSync(fullFile);
      }
    }
    catch (error) {
      if (error.message) {
        console.log(error.message);
      }
      else {
        console.error(error)
      }
    }
  }
}

function sleep(delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay);
  });
}
function isData(file) {
  return file.endsWith(`.${dataExt}`)
}
function isBlocks(file) {
  return file.endsWith(`_blocks.${dataExt}`)
}
function isBlockState(file) {
  return file.endsWith(`_blockstate.${dataExt}`)
}
function isContract(file) {
  return file.endsWith(`_contracts.${dataExt}`)
}
function isDeleteUtxo(file) {
  return file.endsWith(`_deleteutxo.${dataExt}`)
}
function isReceipts(file) {
  return file.endsWith(`_receipts.${dataExt}`)
}
function isRemoveBlocks(file) {
  return file.endsWith(`_removeblock.${dataExt}`)
}
function isUtxos(file) {
  return file.endsWith(`_utxos.${dataExt}`)
}
//
// function shutdown() {
//   for (const action of actions) {
//     if (pool[action.key] && pool[action.key].length) {
//       fs.writeFileSync(`./${action.file}`, pool[action.key].join('\n') + '\n');
//     }
//   }
//   console.log('Shutting down');
//   process.exit(1);
// }
//