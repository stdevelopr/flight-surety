
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {
  
  let result = null;
  
    let contract = new Contract('localhost', () => {
      
        // ##############################
        // Airline Registration
        // #############################

        // Read transaction
        contract.isOperational((error, result) => {
          // display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
          DOM.elid('ownerAddress').innerHTML = contract.getOwnerAddress()
        });

        DOM.elid('operational-true').addEventListener('click', () => {
          console.log("Setting operational status to true")
          // Write transaction
          contract.setOperationalStatus(true, (error, result) => {
              console.log("Operational status set result: ", result)
              contract.isOperational((error, result) => {
                if(!error)
                DOM.elid('status').innerHTML = true
              });
              displayTx('display-wrapper-register', [{ label: 'Setting operational status True: ', error: error, value: result}]);
          });
        })

        DOM.elid('operational-false').addEventListener('click', () => {
          console.log("Setting operational status to true")
          // Write transaction
          contract.setOperationalStatus(false, (error, result) => {
              console.log("Operational status set result: ", result)
              contract.isOperational((error, result) => {
                if(!error)
                DOM.elid('status').innerHTML = false
              });
              displayTx('display-wrapper-register', [{ label: 'Setting operational status False: ', error: error, value: result}]);
          });
        })

        DOM.elid('register-airline').addEventListener('click', () => {
          let airline = DOM.elid('airline-address').value;
          let name = DOM.elid('airline-name').value;
          console.log("Registering airline: ", name, airline)
          // Write transaction
          contract.registerAirline(name, airline, (error, result) => {
              console.log("Register Result", result)
              displayTx('display-wrapper-register', [{ label: 'Airline Registered: ', error: error, value: result}]);
          });
        })
        
        DOM.elid('verify-fund').addEventListener('click', () => {
          let airlineAddress = DOM.elid('airline-actions-address').value;
          console.log("Checking address funds: ", airlineAddress)
          // Write transaction
          contract.isAirlineFunded(airlineAddress, (error, result) => {
            displayTx('display-wrapper-register', [{ label: 'Airline funded: ', error: error, value: result }]);
          });
        })

        DOM.elid('verify-register').addEventListener('click', () => {
          let airlineAddress = DOM.elid('airline-actions-address').value;
          console.log("Checking airline register: ", airlineAddress)
          // Write transaction
          contract.isAirlineRegistered(airlineAddress, (error, result) => {
            displayTx('display-wrapper-register', [{ label: 'Airline registered: ', error: error, value: result }]);
          });
        })

        DOM.elid('verify-pending').addEventListener('click', () => {
          let airlineAddress = DOM.elid('airline-actions-address').value;
          console.log("Checking airline pending: ", airlineAddress)
          // Write transaction
          contract.isAirlinePending(airlineAddress, (error, result) => {
            displayTx('display-wrapper-register', [{ label: 'Airline pending: ', error: error, value: result }]);
          });
        })

        DOM.elid('fund-airline').addEventListener('click', () => {
          let airlineAddress = DOM.elid('airline-actions-address').value;
          console.log("Funding address: ", airlineAddress)
          // Write transaction
          contract.fundAirline(airlineAddress, (error, result) => {
              console.log("Result", error, result)
              displayTx('display-wrapper-register', [{ label: 'Airline funded: ', error: error, value: result }]);
          });
        })

        DOM.elid('vote-airline').addEventListener('click', () => {
          let airlineAddress = DOM.elid('airline-actions-address').value;
          console.log("Voting address: ", airlineAddress)
          // Write transaction
          contract.voteAirline(airlineAddress, (error, result) => {
              console.log("Voting Result", error, result)
              displayTx('display-wrapper-register', [{ label: 'Airline voted: ', error: error, value: result }]);
          });
        })
    

        // ##############################
        // Flight Insurance
        // #############################

        DOM.elid('submit-buy').addEventListener('click', () => {
          let flight = DOM.elid('flight-number').value;
          let airline = DOM.elid('insurance-airline').value;
          let timestamp = DOM.elid('insurance-timestamp').value;
          let amount = DOM.elid('insurance-amount').value;
          // Write transaction
          contract.buy(flight, airline, timestamp, amount, (error, result) => {
              console.log("Buy Result", error, result)
              displayTx('display-wrapper-buy', [{ label: 'Buy Result: ', error: error, value: result }]);
          });
        })

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
          let flight = DOM.elid('flight-number').value;
          let airline = DOM.elid('insurance-airline').value;
          let timestamp = DOM.elid('insurance-timestamp').value;
          // Write transaction
          contract.fetchFlightStatus(flight, airline, timestamp, (error, result) => {
            console.log("Flight status result", result)
            displayTx('display-wrapper-buy', [ { label: 'Fetch Flight Status', error: error, value: "fetching complete"} ]);
          });
      })

      DOM.elid('check-balance').addEventListener('click', () => {
        let passengerAddress = DOM.elid('passanger-address').value;
        contract.getPassengerCredit(passengerAddress, (error, result) => {
            displayTx('display-wrapper-passenger-detail', [{ label: 'Credit pending to withdraw', error: error, value: result / 10**18 + ' ETH' }]);
        });
    })

    DOM.elid('withdraw-balance').addEventListener('click', () => {
        let passengerAddress = DOM.elid('passanger-address').value;
        contract.withdrawCredit(passengerAddress, (error, result) => {
            displayTx('display-wrapper-passenger-detail', [{ label: 'Credit withdrawn', error: error, value: result }]);
        });
    });
    
    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}


function displayTx(id, results) {
  let displayDiv = DOM.elid(id);
  results.map((result) => {
      let row = displayDiv.appendChild(DOM.div({ className: 'row' }));
      row.appendChild(DOM.div({ className: 'col-sm-3 field' }, result.error ? result.label + " Error" : result.label));
      row.appendChild(DOM.div({ className: 'col-sm-9 field-value' }, result.error ? String(result.error) : String(result.value)));
      displayDiv.appendChild(row);
  })
}






