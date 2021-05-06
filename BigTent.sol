pragma solidity 0.5.15;

import "./Hourglass.sol";

contract BigTent {
    /*=================================
    =            MODIFIERS            =
    =================================*/
    modifier onlyAdministrator() {
        address _customerAddress = msg.sender;
        require(
            administrators[_customerAddress],
            "Only administrators can call this function"
        );
        _;
    }

    /*=====================================
    =            CONFIGURABLES            =
    =====================================*/
    address payable internal constant CETO_CONTRACT_ADDRESS =
        0x0E0e76fF0f7F9b22b2f9D47624c2f6Ac5a4dE54E;
    Hourglass internal CETO = Hourglass(CETO_CONTRACT_ADDRESS);

    uint256 public ticketPrice;
    address public partner;
    uint256 public initialGuaranteedPrizePool;
    uint256 public period;
    uint256 public startDate;

    uint256 public countdownStartedAt = 0;
    address[] public participants;
    uint256 public participantsCount = 0;
    bool public gameStarted = false;
    bool public resultDeclared = false;

    uint256 internal firstWinnerIndex;
    uint256 internal secondWinnerIndex;
    uint256 internal thirdWinnerIndex;

    uint256 internal commit = 0;
    uint256 constant BET_EXPIRATION_BLOCKS = 250;
    uint40 internal commitBlockNumber;
    uint256 public startingTronBalance;

    // to keep track of the CETO collected for a particular game
    uint256 internal totalCETOCollected;

    // REBATE TRACKING

    // amount of ceto sent with their buy timestamp for each address
    struct TimestampedCETODeposit {
        uint256 value;
        uint256 gameNumber;
        uint256 valueSold;
    }

    mapping(address => TimestampedCETODeposit[]) internal cetoTimestampedLedger;

    // The start and end index of the unsold timestamped transactions list
    struct DepositCursor {
        uint256 start;
        uint256 end;
    }

    mapping(address => DepositCursor) internal cetoTimestampedCursor;

    // The game number
    // Increment this number every time a new game is started
    uint256 public gameNumber = 0;

    // Mapping to keep track of The dividend collected and the total amount deposited for each game
    struct GameResult {
        uint256 dividendCollected;
        uint256 totalCetoDeposited;
    }
    mapping(uint256 => GameResult) internal gameResults;

    // Mapping to store ticket count of every user
    mapping(uint256 => mapping(address => uint256))
        internal TicketsPerAddressForGame;

    function getEquivalentTron(TimestampedCETODeposit storage _deposit)
        private
        view
        returns (uint256)
    {
        // Check if the gameNumber is associated with the ongoing game
        if (_deposit.gameNumber == gameNumber && gameStarted) {
            return uint256(0);
        }

        GameResult storage _gameResult = gameResults[_deposit.gameNumber];
        uint256 equivalentTron =
            mulDiv(
                SafeMath.sub(_deposit.value, _deposit.valueSold),
                _gameResult.dividendCollected,
                _gameResult.totalCetoDeposited
            );
        return equivalentTron;
    }

    function withdrawRebate(uint256 tronToWithdraw) public {
        // Check if the balance is enough
        uint256 rebateBalance = getRebateBalance();
        require(rebateBalance >= tronToWithdraw, "Don't have enough balance");

        // Starting the from the first block on cetoTimestampedLedger keep moving forward
        // until the until sum of value available is enough to cover the withdrawal amount
        uint256 tronFound = 0;
        address _customerAddress = msg.sender;

        // Update the ledger
        // TODO: Check if storage is required here
        DepositCursor storage _customerCursor =
            cetoTimestampedCursor[_customerAddress];
        uint256 counter = _customerCursor.start;

        while (counter <= _customerCursor.end) {
            TimestampedCETODeposit storage _deposit =
                cetoTimestampedLedger[_customerAddress][counter];
            uint256 tronAvailable = getEquivalentTron(_deposit);
            uint256 tronRequired = SafeMath.sub(tronToWithdraw, tronFound);

            if (tronAvailable < tronRequired) {
                tronFound += tronAvailable;
                delete cetoTimestampedLedger[_customerAddress][counter];
            } else if (tronAvailable == tronRequired) {
                delete cetoTimestampedLedger[_customerAddress][counter];
                _customerCursor.start = counter + 1;
                break;
            } else {
                GameResult storage _gameResult =
                    gameResults[_deposit.gameNumber];
                _deposit.valueSold += mulDiv(
                    tronRequired,
                    _gameResult.totalCetoDeposited,
                    _gameResult.dividendCollected
                );
                _customerCursor.start = counter;
                break;
            }
            counter += 1;
        }

        // Buy rebate CETO
        uint256 cetoBought = CETO.calculateTokensReceived(tronToWithdraw);

        CETO.buy.value(tronToWithdraw)(address(this));
        bool transferSuccess = CETO.transfer(_customerAddress, cetoBought);
        require(transferSuccess, "Unable to buy rebate CETO");
    }

    function getRebateBalance() public view returns (uint256) {
        // Calculate the balance by iterating through the cetoTimestampedLedger
        address _customerAddress = msg.sender;
        DepositCursor storage customerCursor =
            cetoTimestampedCursor[_customerAddress];
        uint256 _rebateBalance = 0;

        for (uint256 i = customerCursor.start; i < customerCursor.end; i++) {
            _rebateBalance += getEquivalentTron(
                cetoTimestampedLedger[_customerAddress][i]
            );
        }
        return _rebateBalance;
    }

    function getCETORebateBalance() public view returns (uint256) {
        uint256 rebateBalance = getRebateBalance();
        uint256 cetoBought = CETO.calculateTokensReceived(rebateBalance);

        // Reduce 10% transaction fee for transfer
        uint256 taxedCETO =
            SafeMath.sub(cetoBought, SafeMath.div(cetoBought, 10));

        return taxedCETO;
    }

    /************mappings************/
    mapping(address => bool) public administrators;

    /*==============================
    =            EVENTS            =
    ==============================*/
    event onTicketPurchase(
        address indexed customerAddress,
        uint8 numberOfTickets
    );
    event onGameEnd(
        uint256 gameNumber,
        address firstWinner,
        address secondtWinner,
        address thirdWinner,
        uint256 firstPrize,
        uint256 secondPrize,
        uint256 thirdPrize
    );
    event onGameStart(uint256 countdownStartedAt);

    constructor() public {
        address owner = msg.sender;
        administrators[owner] = true;
    }

    /**
     * Fallback function to handle tron that was send straight to the contract
     * Return it.
     */
    function() external payable {
        if (msg.sender != CETO_CONTRACT_ADDRESS) {
            revert("Unauthorized sender");
        }
    }

    // Method for admin to start the game
    function startGame(
        uint256 ticketPrice_,
        address partner_,
        uint256 initialGuaranteedPrizePool_,
        uint256 period_,
        uint256 startDate_
    ) external onlyAdministrator() {
        require(!gameStarted, "Game has already been started");

        ticketPrice = ticketPrice_;
        partner = partner_;
        initialGuaranteedPrizePool = initialGuaranteedPrizePool_;
        period = period_;
        startDate = startDate_;
        gameStarted = true;
        resultDeclared = false;
        delete participants;

        startingTronBalance = updateAndFetchTronBalance();
        // Increment the game number by one
        gameNumber += 1;
    }

    // This is the method for user to buy tickets for the raffle
    function buyTicketWithTron(uint8 numberOfTickets) external payable {
        uint256 tronAmountSent = msg.value;
        address _customerAddress = msg.sender;

        uint256 cetoBought = CETO.calculateTokensReceived(tronAmountSent);

        uint256 cetoCostOfTickets =
            SafeMath.mul(ticketPrice, uint256(numberOfTickets));

        require(
            cetoBought >= cetoCostOfTickets,
            "Can't buy enough CETO to cover the ticket cost"
        );

        // Buy the CETO
        CETO.buy.value(tronAmountSent)(address(this));

        // Send the excess CETO back
        if (cetoBought > cetoCostOfTickets) {
            bool transferSuccess =
                CETO.transfer(_customerAddress, cetoBought - cetoCostOfTickets);
            require(transferSuccess, "Unable to transfer excess CETO");
        }

        _allocateTickets(_customerAddress, numberOfTickets);
    }

    // This is the method for user to buy tickets for the raffle
    function buyTicket(uint8 numberOfTickets) external {
        address _customerAddress = msg.sender;
        uint256 cetoCostOfTickets =
            SafeMath.mul(ticketPrice, uint256(numberOfTickets));

        bool success =
            CETO.transferFrom(
                _customerAddress,
                address(this),
                cetoCostOfTickets
            );

        if (!success) {
            revert("Transfer Failed");
        }
        _allocateTickets(_customerAddress, numberOfTickets);
    }

    function _allocateTickets(address _customerAddress, uint8 numberOfTickets)
        internal
    {
        // Maintain a list of participants
        // Run a for loop for multiple entries
        for (uint8 i = 0; i < numberOfTickets; i++) {
            participants.push(_customerAddress);
        }
        participantsCount += numberOfTickets;

        uint256 cetoCostOfTickets =
            SafeMath.mul(ticketPrice, uint256(numberOfTickets));
        totalCETOCollected += cetoCostOfTickets;

        // Store this buy in the deposit ledger
        cetoTimestampedLedger[_customerAddress].push(
            TimestampedCETODeposit(cetoCostOfTickets, gameNumber, 0)
        );
        cetoTimestampedCursor[_customerAddress].end += 1;

        TicketsPerAddressForGame[gameNumber][_customerAddress] += uint256(
            numberOfTickets
        );
        // Check if totalCetoBalance is greater than or equal to GPP and the countdown hasn't been set yet
        if (
            getCurrentCETOBalance() >= initialGuaranteedPrizePool &&
            countdownStartedAt == 0
        ) {
            countdownStartedAt = block.timestamp;

            emit onGameStart(countdownStartedAt);
        }

        emit onTicketPurchase(_customerAddress, numberOfTickets);
    }

    // This is an admin only function to set commit.
    // Commits are the Keccak256 hash of some secret "reveal" random number, to be supplied
    // by the bot in the declareResult transaction. Supplying
    // "commit" ensures that "reveal" cannot be changed behind the scenes
    // after setCommit has been mined.
    function setCommit(uint256 commit_) external onlyAdministrator() {
        commit = commit_;
        commitBlockNumber = uint40(block.number);
    }

    // This is the method used to settle bets. declareResult should supply a "reveal" number
    // that would Keccak256-hash to "commit". "blockHash" is the block hash
    // of setCommit block as seen by croupier; it is additionally asserted to
    // prevent changing the bet outcomes on Ethereum reorgs.
    function declareResult(uint256 reveal)
        external
        onlyAdministrator
        returns (uint256)
    {
        // Check if the reveal is valid
        uint256 commit_ = uint256(keccak256(abi.encodePacked(reveal)));
        require(commit_ == commit, "Invaild reveal");

        require(gameStarted, "A game isn't running right now");
        require(!resultDeclared, "Result is already declared");

        require(participantsCount > 2, "Insufficient participants");

        require(
            countdownStartedAt + period <= block.timestamp,
            "Countdown hasn't finished yet"
        );

        require(
            totalCETOCollected >= mulDiv(initialGuaranteedPrizePool, 2, 3),
            "Insufficient amount"
        );

        // Check that bet has not expired yet (see comment to BET_EXPIRATION_BLOCKS).
        require(
            block.number >= commitBlockNumber,
            "declareResult in the same block as setCommit, or before."
        );
        require(
            block.number < commitBlockNumber + BET_EXPIRATION_BLOCKS,
            "Blockhash can't be queried by EVM."
        );

        // The RNG - combine "reveal" and blockhash of setCommit using Keccak256. Miners
        // are not aware of "reveal" and cannot deduce it from "commit",
        // and house is unable to alter the "reveal" after setCommit has been mined.
        bytes32 firstEntropy =
            keccak256(abi.encodePacked(reveal, blockhash(commitBlockNumber)));
        firstWinnerIndex = uint256(firstEntropy) % participantsCount;
        address firstWinner = participants[firstWinnerIndex];

        bytes32 secondEntropy = keccak256(abi.encodePacked(firstEntropy));
        secondWinnerIndex = (uint256(secondEntropy) % (participantsCount - 1));
        secondWinnerIndex = secondWinnerIndex < firstWinnerIndex
            ? secondWinnerIndex
            : secondWinnerIndex + 1;
        address secondWinner = participants[secondWinnerIndex];

        bytes32 thirdEntropy = keccak256(abi.encodePacked(secondEntropy));
        thirdWinnerIndex = uint256(thirdEntropy) % (participantsCount - 2);
        thirdWinnerIndex = thirdWinnerIndex <
            min(secondWinnerIndex, firstWinnerIndex)
            ? thirdWinnerIndex
            : thirdWinnerIndex < (max(secondWinnerIndex, firstWinnerIndex) - 1)
            ? thirdWinnerIndex + 1
            : thirdWinnerIndex + 2;
        address thirdWinner = participants[thirdWinnerIndex];

        // Calculate the prize money
        uint256 firstPrize;
        uint256 secondPrize;
        uint256 thirdPrize;
        (firstPrize, secondPrize, thirdPrize) = getPrizes();
        uint256 partnerPoolFunds = getPartnerPoolFunds();

        // Send/Assign the prize money to the winners
        bool success;
        success = CETO.transfer(firstWinner, firstPrize);
        if (!success) {
            revert("First prize distribution failed");
        }
        success = CETO.transfer(secondWinner, secondPrize);
        if (!success) {
            revert("Second prize distribution failed");
        }
        success = CETO.transfer(thirdWinner, thirdPrize);
        if (!success) {
            revert("Third prize distribution failed");
        }

        // Assign/Payout out the promotional partner
        if (partner != address(0)) {
            success = CETO.transfer(partner, partnerPoolFunds);
            if (!success) {
                revert("Partner pool funds distribution failed");
            }
        }

        // Calculate the dividend collected
        uint256 tronCollected =
            updateAndFetchTronBalance() - startingTronBalance;
        gameResults[gameNumber] = GameResult(tronCollected, totalCETOCollected);

        resultDeclared = true;

        emit onGameEnd(
            gameNumber,
            participants[firstWinnerIndex],
            participants[secondWinnerIndex],
            participants[thirdWinnerIndex],
            firstPrize,
            secondPrize,
            thirdPrize
        );
    }

    function updateAndFetchTronBalance() public returns (uint256) {
        if (CETO.myDividends(true) > 0) {
            CETO.withdraw();
        }
        uint256 tronBalance = address(this).balance;
        return tronBalance;
    }

    function totalTronBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function resetGame() external onlyAdministrator() {
        require(gameStarted, "A game isn't running right now");
        require(resultDeclared, "Result isn't declared yet");

        // Resetting the data
        ticketPrice = 0;
        partner = address(0);
        initialGuaranteedPrizePool = 0;
        period = 0;
        startDate = 0;
        countdownStartedAt = 0;
        participantsCount = 0;

        gameStarted = false;

        totalCETOCollected = 0;
    }

    // TEST
    function setParticipantsCount(uint256 participants_)
        external
        onlyAdministrator()
    {
        participantsCount = participants_;
    }

    /*----------  READ ONLY FUNCTIONS  ----------*/

    function getCursor() public view returns (uint256, uint256) {
        address _customerAddress = msg.sender;
        DepositCursor storage cursor = cetoTimestampedCursor[_customerAddress];

        return (cursor.start, cursor.end);
    }

    function TimestampedCETODeposits(uint256 counter)
        public
        view
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        address _customerAddress = msg.sender;
        TimestampedCETODeposit storage transaction =
            cetoTimestampedLedger[_customerAddress][counter];
        return (
            transaction.value,
            transaction.gameNumber,
            transaction.valueSold
        );
    }

    function getCurrentCETOBalance() public view returns (uint256) {
        return CETO.myTokens();
    }

    function getUserTickets() public view returns (uint256) {
        return TicketsPerAddressForGame[gameNumber][msg.sender];
    }

    function getGameResult(uint256 game)
        public
        view
        returns (uint256, uint256)
    {
        GameResult storage gameResult = gameResults[game];

        return (gameResult.dividendCollected, gameResult.totalCetoDeposited);
    }

    function getEventData()
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            bool,
            bool,
            uint256
        )
    {
        return (
            ticketPrice,
            participantsCount,
            initialGuaranteedPrizePool,
            startDate,
            countdownStartedAt,
            period,
            gameStarted,
            resultDeclared,
            gameNumber
        );
    }

    function getPrizes()
        public
        view
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        uint256 currentPoolFunds = getFunds();

        // Calculate the prize money
        uint256 firstPrize = mulDiv(currentPoolFunds, 9, 13);
        uint256 secondPrize = mulDiv(currentPoolFunds, 3, 13);
        uint256 thirdPrize = mulDiv(currentPoolFunds, 1, 13);
        return (firstPrize, secondPrize, thirdPrize);
    }

    function getWinners()
        external
        view
        returns (
            address,
            address,
            address
        )
    {
        return (
            participants[firstWinnerIndex],
            participants[secondWinnerIndex],
            participants[thirdWinnerIndex]
        );
    }

    function getWinnersIndex()
        external
        view
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        return (firstWinnerIndex, secondWinnerIndex, thirdWinnerIndex);
    }

    function getPartnerPoolFunds() public view returns (uint256) {
        uint256 partnerPoolFunds_ = 0;

        // Calculate 67% of the amout collected
        uint256 minimumRequiredAmount =
            mulDiv(initialGuaranteedPrizePool, 2, 3);

        if (partner != address(0)) {
            // Check if the amount collected is atleast 67% of the initial GPP
            // if amount collected is less than 67% than the partner gets nothing
            // and all the amount goes to the prize pool
            // else 67% goes to the prize pool and the gets remaining 33% goes to the partner pool
            if (getCurrentCETOBalance() > minimumRequiredAmount) {
                partnerPoolFunds_ = mulDiv(initialGuaranteedPrizePool, 1, 3);
            }

            // Check if the amount collected is greater than the initial GPP
            // if yes than 50% of the difference amount goes to the partner pool
            if (getCurrentCETOBalance() > initialGuaranteedPrizePool) {
                uint256 differenceAmount =
                    getCurrentCETOBalance() - initialGuaranteedPrizePool;
                partnerPoolFunds_ = SafeMath.add(
                    partnerPoolFunds_,
                    SafeMath.div(differenceAmount, 2)
                );
            }
        }

        return partnerPoolFunds_;
    }

    function getFunds() public view returns (uint256) {
        uint256 currentPrizePool;
        uint256 nextPoolFunds = 0;
        uint256 differenceAmount;

        // Calculate 67% of the amout collected
        uint256 minimumRequiredAmount =
            mulDiv(initialGuaranteedPrizePool, 2, 3);

        // Calculate the difference amount if amount collected is greater than the initial gpp
        if (getCurrentCETOBalance() > initialGuaranteedPrizePool) {
            differenceAmount =
                getCurrentCETOBalance() -
                initialGuaranteedPrizePool;
        }

        if (partner == address(0)) {
            // Check if the amount collected is greater than the initial GPP
            // if yes than 50% of the difference amount goes to the current prize pool
            // and 50% to the next prize pool
            if (getCurrentCETOBalance() > initialGuaranteedPrizePool) {
                currentPrizePool = SafeMath.add(
                    initialGuaranteedPrizePool,
                    SafeMath.div(differenceAmount, 2)
                );
                nextPoolFunds = SafeMath.div(differenceAmount, 2);
            } else {
                currentPrizePool = initialGuaranteedPrizePool;
            }
        } else {
            // If amount collected is less than equal to 67% than entire collected
            // amount goes to the current prize pool.
            // else 67% goes to the current prize pool and rest to the partner pool
            if (getCurrentCETOBalance() <= minimumRequiredAmount) {
                currentPrizePool = getCurrentCETOBalance();
            } else {
                currentPrizePool = mulDiv(initialGuaranteedPrizePool, 2, 3);
                // Check if the amount collected is greater than the initial GPP
                // if yes than 50% of the difference amount goes to partner pool,
                // 25% to the current prize pool and 25% to the next prize pool
                if (getCurrentCETOBalance() > initialGuaranteedPrizePool) {
                    currentPrizePool = SafeMath.add(
                        currentPrizePool,
                        SafeMath.div(differenceAmount, 4)
                    );
                    nextPoolFunds = SafeMath.div(differenceAmount, 4);
                }
            }
        }

        return currentPrizePool;
    }

    /*----------  ADMINISTRATOR ONLY FUNCTIONS  ----------*/

    function setAdministrator(address _identifier, bool _status)
        external
        onlyAdministrator()
    {
        administrators[_identifier] = _status;
    }

    // Function to transfer the remaining funds to administrator when the game
    // has ended and the admin wishes to replace this contract with another
    // upgraded contract
    function transferFunds() external onlyAdministrator() {
        require(!gameStarted, "Game has already been started");

        address administrator_ = msg.sender;

        bool success = CETO.transfer(administrator_, getCurrentCETOBalance());
        if (!success) {
            revert("Transfer failed");
        }
    }

    /*----------  HELPERS AND CALCULATORS  ----------*/

    /**
     * @dev calculates x*y and outputs a emulated 512bit number as l being the lower 256bit half and h the upper 256bit half.
     */
    function fullMul(uint256 x, uint256 y)
        public
        pure
        returns (uint256 l, uint256 h)
    {
        uint256 mm = mulmod(x, y, uint256(-1));
        l = x * y;
        h = mm - l;
        if (mm < l) {
            h -= 1;
        }
    }

    /**
     * @dev calculates max.
     */
    function max(uint256 x, uint256 y) public pure returns (uint256) {
        return x > y ? x : y;
    }

    /**
     * @dev calculates min.
     */
    function min(uint256 x, uint256 y) public pure returns (uint256) {
        return x < y ? x : y;
    }

    /**
     * @dev calculates x*y/z taking care of phantom overflows.
     */
    function mulDiv(
        uint256 x,
        uint256 y,
        uint256 z
    ) public pure returns (uint256) {
        (uint256 l, uint256 h) = fullMul(x, y);
        require(h < z);
        uint256 mm = mulmod(x, y, z);
        if (mm > l) h -= 1;
        l -= mm;
        uint256 pow2 = z & -z;
        z /= pow2;
        l /= pow2;
        l += h * ((-pow2) / pow2 + 1);
        uint256 r = 1;
        r *= 2 - z * r;
        r *= 2 - z * r;
        r *= 2 - z * r;
        r *= 2 - z * r;
        r *= 2 - z * r;
        r *= 2 - z * r;
        r *= 2 - z * r;
        r *= 2 - z * r;
        return l * r;
    }
}

/**
 * @title SafeMath_
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath_ {
    /**
     * @dev Multiplies two numbers, throws on overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        assert(c / a == b);
        return c;
    }

    /**
     * @dev Integer division of two numbers, truncating the quotient.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        // assert(b > 0); // Solidity automatically throws when dividing by 0
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold
        return c;
    }

    /**
     * @dev Substracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }

    /**
     * @dev Adds two numbers, throws on overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }
}
