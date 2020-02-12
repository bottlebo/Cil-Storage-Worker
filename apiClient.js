const axios = require('axios');

class ApiClient {
  constructor(options, config) {
    axios.defaults.maxContentLength = 60 * 1024 * 1024;
    axios.defaults.baseURL = config.apiUrl;
    axios.defaults.headers.post['Content-Type'] = 'application/json; charset=utf-8'
    if (options.apiUser && options.apiPassword) {
      const auth = 'Basic ' + new Buffer.from(options.apiUser + ':' + options.apiPassword).toString('base64');
      axios.defaults.headers.common['Authorization'] = auth;
    }
  }

  async saveBlocks(arrBlocks) {
    await axios.post('Blocks', arrBlocks);
  }
  
  async setBlockState(arrObj) {
    for (const {hash, state} of arrObj) {
      await axios.post(`State/${hash}`, {state})
    }
  }

  async removeBlocks(arrHashes) {
    for(const hash of arrHashes) {
      await axios.delete(`Block/${hash}`)
    }
  }

  async saveUtxos(arrUtxos) {
    await axios.post('Utxo', arrUtxos)
  }

  async deleteUtxos(arrHashes) {
    const data = arrHashes.map(obj => obj.hash);
    await axios.delete(`Utxo`, {data})
  }

  async saveReceipts(arrReceipts) {
      await axios.post('Receipt', arrReceipts)
  }

  async saveContracts(arrContract) {
     
    await axios.post('Contract', arrContract)
  }
}

module.exports = ApiClient