import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";
import express from "express";
import "babel-polyfill";

let config = Config["localhost"];
let web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
);

async function registerOracles() {
  try {
    const fee = await flightSuretyApp.methods.getRegistrationFee().call();
    const accounts = await web3.eth.getAccounts();
    for (const account of accounts) {
      console.log("account=", account);
      await flightSuretyApp.methods.registerOracle().send({
        from: account,
        value: fee,
        gas: 6721900,
      });
    }
    console.log("[", accounts.length, "] Oracles registered");
  } catch (e) {
    console.log("Error registering oracle", e);
  }
}

async function simulateResponse(requestedIndex, airline, flight, timestamp) {
  const accounts = await web3.eth.getAccounts();
  for (const account of accounts) {
    const statusCode = 20
    const indexes = await flightSuretyApp.methods
      .getMyIndexes()
      .call({ from: account });
    console.log(`Oracle account: ${account}, indexes: ${indexes} --- Requested index: ${requestedIndex}`);
    if(indexes.includes(requestedIndex)) {
      console.log("Oracle match! Submitting response. Status code: ", statusCode)
      await flightSuretyApp.methods
            .submitOracleResponse(requestedIndex, airline, flight, timestamp, statusCode)
            .send({ from: account, gas: 6721900 });
    }
      

  }
}


// flightSuretyApp.events.OracleReport()
// .on('data', log => {
//   const {
//     event,
//     returnValues: { flight, destination, timestamp, status }
//   } = log
//   console.log(`${event}: flight ${flight}, to ${destination}, landing ${timestamp}, status ${this.states[status]}`)
// })


// flightSuretyApp.events.FlightProcessed()
// .on('data', log => {
//   const { event, returnValues: { flightRef, destination, timestamp, statusCode } } = log
//   console.log(`${event}: flight ${flightRef}, to ${destination}, landing ${timestamp}, status ${this.states[statusCode]}`)
// })



flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0,
  },
  async function (error, event) {
    if (error) console.log(error);
    else {
      await simulateResponse(
        event.returnValues[0],
        event.returnValues[1],
        event.returnValues[2],
        event.returnValues[3]
      );
    }
  }
);

flightSuretyApp.events.FlightStatusInfo(
  {
    fromBlock: 0,
  },
  async (error, event) => {
    console.log(`3 or more oracles agreed on this result... Flight ${event.returnValues[1]}, status: ${event.returnValues[3]}`)
  }
);

registerOracles();
const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

export default app;
