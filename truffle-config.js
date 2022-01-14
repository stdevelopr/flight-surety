var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "quality alien fringe merry work dream pair eight truck napkin model poem";
var Web3 = require('web3');
module.exports = {
  networks: {
    // development: {
    //   provider: function() {
    //     return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
    //   },
    //   network_id: '*'
    // }
    development: {
      host: "127.0.0.1",     // Localhost
      port: 8545,            // Standard Ganache UI port
      network_id: "*",
      provider: function() {
        return new Web3.providers.WebsocketProvider("ws://127.0.0.1:8545/");
      }
    }
  },
  compilers: {
    solc: {
      version: "^0.4.25"
    }
  }
};