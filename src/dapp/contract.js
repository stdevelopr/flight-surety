import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";

export default class Contract {
  constructor(network, callback) {
    let config = Config[network];
    console.log("Config", config)
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    );
    this.initialize(callback);
    this.owner = null;
    this.airlines = [];
    this.passengers = [];
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      this.owner = accts[0];
      console.log("Owner", this.owner);
      let counter = 1;

      while (this.airlines.length < 5) {
        this.airlines.push(accts[counter++]);
      }

      while (this.passengers.length < 5) {
        this.passengers.push(accts[counter++]);
      }

      console.log("Airlines accounts", this.airlines);

      callback();
    });
  }

  getOwnerAddress() {
    return this.owner;
  }

  isOperational(callback) {
    let self = this;
    self.flightSuretyApp.methods
      .isOperational()
      .call({ from: self.owner }, callback);
  }

  fundAirline(airlineAddress, callback) {
    let self = this;
    const value = this.web3.utils.toWei("10", "ether");
    self.flightSuretyApp.methods
      .fundAirline(airlineAddress)
      .send({ from: airlineAddress, value: value }, callback);
  }

  isAirlineFunded(airlineAddress, callback) {
    let self = this;
    self.flightSuretyApp.methods
      .isAirlineFunded(airlineAddress)
      .call({ from: self.owner }, callback);
  }

  isAirlineRegistered(airlineAddress, callback) {
    let self = this;
    self.flightSuretyApp.methods
      .isAirlineRegistered(airlineAddress)
      .call({ from: self.owner }, callback);
  }

  isAirlinePending(airlineAddress, callback) {
    let self = this;
    self.flightSuretyApp.methods
      .isAirlinePending(airlineAddress)
      .call({ from: self.owner }, callback);
  }

  setOperationalStatus(status, callback) {
    console.log("Setting operational status: ", status);
    let self = this;
    self.flightSuretyApp.methods
      .setOperationalStatus(status)
      .send({ from: self.owner }, (error, result) => {
        callback(error, result);
      });
  }


  fetchFlightStatus(flight, airline, timestamp, callback) {
    console.log("Fetching status for airline, flight: ", airline, flight);
    let self = this;
    let payload = {
      airline: airline,
      flight: flight,
      timestamp: timestamp,
    };
    self.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: self.owner }, (error, result) => {
        callback(error, result);
      });
  }

  async registerAirline(name, address, callback) {
    let self = this;
    try {
      await self.flightSuretyApp.methods
        .registerAirline(name, address)
        .send({ from: self.owner, gas: 6721900 });

      const registered = await self.flightSuretyApp.methods
        .isAirlineRegistered(address)
        .call({ from: self.owner });

      if (registered) callback(null, "Airline registered");
      else callback("Airline NOT registered", null);
    } catch (e) {
      callback(e, null);
    }
  }

  async voteAirline(airline, callback) {
    let self = this;
    console.log("Voting airline: ", airline);
    try {
      const result = await self.flightSuretyApp.methods
        .voteAirline(airline)
        .send({ from: self.owner, gas: 6721900 });

      callback(null, "Airline voted!");
    } catch (e) {
      callback(e, null);
    }
  }

  buy(flightName, airlineAddress, timestamp, amount, callback) {
    let self = this;
    const insuredAmount = this.web3.utils.toWei(amount, "ether");
    self.flightSuretyApp.methods
      .buy(flightName, airlineAddress, timestamp)
      .send({ from: self.owner, gas: 6721900, value: insuredAmount }, callback);
  }

  getPassengerCredit(passangerAddress, callback) {
    let self = this;
    self.flightSuretyApp.methods
        .getPassengerCredit(passangerAddress)
        .call({ from: self.owner }, callback);
}

withdrawCredit(pessengerAddress, callback) {
    let self = this;
    self.flightSuretyApp.methods
        .withdrawCredit(pessengerAddress)
        .send({ from: self.owner }, (error, result) => {
            callback(error, result);
        });
}
}
