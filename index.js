const fs = require('fs-ext');
const axios = require('axios');
const commandLineArgs = require('command-line-args');

const configs = require('./config.json');
let swapPath;
const blocksFile = 'blocks.dump';
let pool = [];
const optionDefinitions = [
  {name: 'config', alias: 'c', type: String, multiple: false},
  {name: 'apiUser', alias: 'u', type: String, multiple: false},
  {name: 'apiPassword', alias: 'p', type: String, multiple: false}
];
//
(async () => {
  const options = commandLineArgs(optionDefinitions, {camelCase: true});

  const config = options.config? configs[options.config] : configs['devel'];
  axios.defaults.baseURL = config.apiUrl;
  if (options.apiUser && options.apiPassword) {
    const auth = 'Basic ' + new Buffer.from(options.apiUser + ':' + options.apiPassword).toString('base64');
    axios.defaults.headers.common['Authorization'] = auth;
  }
  swapPath = config['swapPath'];
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

//!!
  const blocks = read(`./${blocksFile}`);

  if (blocks && blocks.length) {
    pool['blocks'] = [...blocks];
  }
  while (true) {
    await sleep(5110);
    await load('blocks', blocksFile, 'Blocks');
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
async function load(key, file, url) {
  let arrData;
  if (pool[key] && pool[key].length) {
    arrData = [...pool[key]];
    console.log('from pool:', arrData.length);
  }
  else {
    arrData = read(`${swapPath}${file}`);
    console.log('from file:', arrData.length)
  }
  if (arrData && arrData.length) {
    try {
      //!!
      await axios.post(url, arrData)
      pool[key] = [];
    }
    catch (error) {
      push(key, arrData)
    }
  }
}
function push(key, data) {
  pool[key] = [...data];
  console.log('pool len:', pool[key].length)
}
//
function shutdown() {
  //console.log(pool['blocks']);

  if (pool['blocks'] && pool['blocks'].length) {
    console.log(pool['blocks']);
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
