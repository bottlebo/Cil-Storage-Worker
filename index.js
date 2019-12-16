const fs = require('fs-ext');
const commandLineArgs = require('command-line-args');

const configs = require('./config.json');
const ApiClient = require('./apiClient');
let swapPath;
const _client = new ApiClient(options, config);

let pool = [];
const optionDefinitions = [
  {name: 'config', alias: 'c', type: String, multiple: false},
  {name: 'apiUser', alias: 'u', type: String, multiple: false},
  {name: 'apiPassword', alias: 'p', type: String, multiple: false}
];
const actions = [
  {key: 'blocks', file: 'blocks.dump', apiCall: _client.saveBlocks},
  {key: 'utxos', file: 'utxos.dump', apiCall: _client.saveUtxos},
  {key: 'blockstate', file: 'blockstate.dump', apiCall: _client.setBlockState},
  {key: 'receipts', file: 'receipts.dump', apiCall: _client.saveReceipts},
  {key: 'contracts', file: 'contracts.dump', apiCall: _client.saveContracts},
  {key: 'removeBlocks', file: 'removeblock.dump', apiCall: _client.removeBlocks},
  {key: 'deleteUtxos', file: 'deleteutxo.dump', apiCall: _client.deleteUtxos},

];
//
(async () => {
  const options = commandLineArgs(optionDefinitions, {camelCase: true});

  const config = options.config ? configs[options.config] : configs['devel'];

  swapPath = config['swapPath'];
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  //!!
  for (const action of actions) {
    const data = read(`./${action.file}`);
    if (data && data.length) {
      pool[action.key] = [...data];
    }
  }
  while (true) {
    for (const action of actions) {
      await sleep(2000);
      await load(action.key, action.file, action.apiCall);
    }
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
async function load(key, file, apiCall) {
  let arrData;
  if (pool[key] && pool[key].length) {
    arrData = [...pool[key]];
  }
  else {
    arrData = read(`${swapPath}${file}`);
  }
  if (arrData && arrData.length) {
    try {
      const data = arrData.map(str => JSON.parse(str));
      await apiCall(data);
      pool[key] = [];
    }
    catch (error) {
      push(key, arrData);
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
  for (const action of actions) {
    if (pool[action.key] && pool[action.key].length) {
      fs.writeFileSync(`./${action.file}`, pool[action.key].join('\n') + '\n');
    }
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
