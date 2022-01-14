var Test = require("../config/testConfig.js");
var BigNumber = require("bignumber.js");

contract("Flight Surety Tests", async (accounts) => {
  var config;
  before("setup contract", async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(
      config.flightSuretyApp.address
    );
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, {
        from: config.testAddresses[2],
      });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(
      accessDenied,
      false,
      "Access not restricted to Contract Owner"
    );
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSurety.setTestingMode(true);
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it("(airline) Not registered airline may not be able to register a new airline", async () => {
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, {
        from: accounts[3],
      });
    } catch (e) {}
    let result = await config.flightSuretyData.isAirlineRegistered.call(
      newAirline
    );

    // ASSERT
    assert.equal(
      result,
      false,
      "Non Airline should not be able to register another airline"
    );
  });

  it("(airline) Registered airline should be able to register a new airline for a maximum of four, and the fifth on must be pending", async () => {
    // ACT
    try {
      await config.flightSuretyApp.registerAirline("second_airline", accounts[1], {
        from: config.owner,
      });
      await config.flightSuretyApp.registerAirline("third_airline", accounts[2], {
        from: accounts[1],
      });
      await config.flightSuretyApp.registerAirline("forth_airline", accounts[3], {
        from: accounts[2],
      });
      await config.flightSuretyApp.registerAirline("fifth_airline", accounts[4], {
        from: accounts[3],
      });
    } catch (e) {}
    let acc1 = await config.flightSuretyData.isAirlineRegistered.call(
      config.owner
    );
    let acc2 = await config.flightSuretyData.isAirlineRegistered.call(
      accounts[1]
    );
    let acc3 = await config.flightSuretyData.isAirlineRegistered.call(
      accounts[2]
    );
    let acc4 = await config.flightSuretyData.isAirlineRegistered.call(
      accounts[3]
    );
    let acc5 = await config.flightSuretyData.isAirlineRegistered.call(
      accounts[4]
    );
    let pend5 = await config.flightSuretyData.isAirlinePending.call(
      accounts[4]
    );

    // ASSERT
    assert.equal(acc1, true, "first airline should be registered");
    assert.equal(acc2, true, "second airline should be registered");
    assert.equal(acc3, true, "third airline should be registered");
    assert.equal(acc4, true, "forth airline should be registered");
    assert.equal(acc5, false, "fifth airline should not be registered");
    assert.equal(pend5, true, "fifth airline should be pending");
  });

  it("(airline) Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines", async () => {
    let pendingAirline = accounts[4];
    let res = await config.flightSuretyData.isAirlinePending.call(
      pendingAirline
    );

    assert.equal(res, true, "should be pending");

    const registeredAirlineCount =
      await config.flightSuretyData.getRegisteredAirlineCounter.call();

    assert.equal(registeredAirlineCount, 4, "should be 4 registered airlines");

    try {
      let i = 0;
      do {
        i += 1;
        await config.flightSuretyApp.voteAirline(pendingAirline, {
          from: config.owner,
        });
      } while (i < registeredAirlineCount / 2);

    } catch (e) {
      console.log("Voting Error", e);
    }

    let registered = await config.flightSuretyData.isAirlineRegistered.call(
      pendingAirline
    );

    assert.equal(registered, true, "Airline should be registered after 50% voting");
  });
});
