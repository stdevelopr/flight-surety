pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint256 private constant AIRLINE_FUNDING_MINIMUM_AMOUNT = 10 ether;

    address private contractOwner; // Account used to deploy contract

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }

    struct Airline {
        string name;
        address airlineAddress;
        bool isFunded;
        uint256 votes;
    }

    mapping(bytes32 => Flight) private flights;
    uint256 private constant MAX_INSURANCE_AMOUNT = 1 ether;
    IFlightSuretyData private flightSuretyData;

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        // Modify to call data contract's status
        bool operational = isOperational();
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(address dataContractAddress) public {
        contractOwner = msg.sender;
        flightSuretyData = IFlightSuretyData(dataContractAddress);
        _registerAirline("first_airline", contractOwner);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public returns (bool) {
        return flightSuretyData.isOperational();
    }

    function isAirlineFunded(address airlineAddress) external returns (bool) {
        return flightSuretyData.isAirlineFunded(airlineAddress);
    }

    function isAirlineRegistered(address airlineAddress)
        external
        returns (bool)
    {
        return flightSuretyData.isAirlineRegistered(airlineAddress);
    }

    function isAirlinePending(address airlineAddress) external returns (bool) {
        return flightSuretyData.isAirlinePending(airlineAddress);
    }

    function getAirlineVotes(address airlineAddress)
        external
        returns (uint256)
    {
        return flightSuretyData.getAirlineVotes(airlineAddress);
    }

    // function getRegisteredAirlines() public returns (bytes32[]){
    //     return flightSuretyData.getRegisteredAirlines();
    // }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function setOperationalStatus(bool status) external {
      flightSuretyData.setOperationalStatus(status);
    }

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerAirline(string name, address airlineAddress)
        external requireIsOperational
        returns (bool)
    {
        require(
            flightSuretyData.isAirlineRegistered(msg.sender),
            "You must be registered to register an airline"
        );
        require(
            !flightSuretyData.isAirlineRegistered(airlineAddress),
            "The airline is already registered"
        );

        require(
            !flightSuretyData.isAirlineRegistered(airlineAddress),
            "The airline is already registered"
        );
        require(
            !flightSuretyData.isAirlinePending(airlineAddress),
            "Airline is already waiting for voting consensus"
        );
        // require(
        //     flightSuretyData.isAirlineFunded(airlineAddress),
        //     "The airline must be funded in order to be registered"
        // );

        if (flightSuretyData.getRegisteredAirlineCounter() < 4) {
            _registerAirline(name, airlineAddress);
            return (true);
        }
        flightSuretyData.addPendingAirline(name, airlineAddress);
        return (false);
    }

    function _registerAirline(string name, address airlineAddress) private requireIsOperational {
        flightSuretyData.registerAirline(name, airlineAddress);
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight() external pure {}

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal requireIsOperational{
        if (
            statusCode == STATUS_CODE_LATE_AIRLINE ||
            statusCode == STATUS_CODE_LATE_AIRLINE ||
            statusCode == STATUS_CODE_LATE_TECHNICAL ||
            statusCode == STATUS_CODE_LATE_WEATHER ||
            statusCode == STATUS_CODE_LATE_OTHER
        ) {
            bytes32 flightKey = getFlightKey(airline, flight, timestamp);
            flightSuretyData.creditInsurees(flightKey);
        }
    }

    function withdrawCredit(address pessangerAddress) external {
        require(pessangerAddress != address(0), "Address not valid");
        flightSuretyData.pay(pessangerAddress);
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string flight,
        uint256 timestamp
    ) external requireIsOperational {
        uint8 index = getRandomIndex(msg.sender);

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    function fundAirline(address airlineAddress) external payable requireIsOperational {
      require(msg.value == 10 ether, 'Need to send 10 ETH');

        flightSuretyData.fundAirline(airlineAddress, msg.value);
    }

    function voteAirline(address airlineAddress) external requireIsOperational {
        require(
            flightSuretyData.isAirlinePending(airlineAddress),
            "No needs to vote. Airline is not pending."
        );
        require(
            flightSuretyData.isAirlineRegistered(msg.sender),
            "You must be a registered airline in order to vote."
        );
        require(
            flightSuretyData.isAirlineFunded(msg.sender),
            "You must be funded in order to vote."
        );
        flightSuretyData.voteAirline(airlineAddress);
    }

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    function getRegistrationFee() public pure returns (uint256) {
        return REGISTRATION_FEE;
    }

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    // Register an oracle with the contract
    function registerOracle() external payable requireIsOperational {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes() external view returns (uint8[3]) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    ) external requireIsOperational {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal requireIsOperational returns (uint8[3]) {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal requireIsOperational returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    function buy(
        string flightName,
        address airlineAddress,
        uint256 timestamp
    ) external payable requireIsOperational {
        require(
            flightSuretyData.isAirlineRegistered(airlineAddress),
            "Airline is not registered"
        );
        require(
            flightSuretyData.isAirlineFunded(airlineAddress),
            "Airline is not funded"
        );
        require(
            msg.value <= MAX_INSURANCE_AMOUNT,
            "Insuranced amount must be 1 ether or less"
        );
        bytes32 flightKey = getFlightKey(airlineAddress, flightName, timestamp);
        flightSuretyData.buy.value(msg.value)(flightKey, msg.sender, msg.value);
    }

    function getPassengerCredit(address insuredPassenger)
        external
        view
        requireIsOperational
        returns (uint256)
    {
        return flightSuretyData.getPassengerCredit(insuredPassenger);
    }

    // endregion
}

contract IFlightSuretyData {
    function isOperational() public view returns (bool);

    function isAirlineRegistered(address airline) external view returns (bool);

    function isAirlineFunded(address airline) external view returns (bool);

    function isAirlinePending(address airline) external view returns (bool);

    function getRegisteredAirlineCounter() public view returns (uint256);
    
    function setOperationalStatus(bool status) external;

    function registerAirline(string name, address airlineAddress) external;

    // function getRegisteredAirlines() external returns (bytes32[]);

    function addPendingAirline(string name, address airlineAddress) external;

    function voteAirline(address airlineAddress) external;

    function getAirlineVotes(address airlineAddress) external returns (uint256);

    function fundAirline(address airlineAddress, uint256 amount)
        external
        payable;

    function buy(
        bytes32 flightKey,
        address passengerAddress,
        uint256 insuredAmount
    ) external payable;

    function creditInsurees(bytes32 flightKey) external;

    function pay(address passengerAddress) external payable;

    function getPassengerCredit(address passangerAddress)
        external
        view
        returns (uint256);
}
