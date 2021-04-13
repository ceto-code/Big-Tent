pragma solidity ^0.5.0;

import "./Hourglass.sol";

contract BigTent {
    /*=================================
    =            MODIFIERS            =
    =================================*/
    modifier onlyAdministrator() {
        address _customerAddress = msg.sender;
        require(administrators[_customerAddress]);
        _;
    }

    /*=====================================
    =            CONFIGURABLES            =
    =====================================*/
    address payable internal constant contract_address =
        0xEA46a528240ca7EbE8B0fc384a920e332D1De6C6;
    Hourglass internal CETO = Hourglass(contract_address);

    uint256 internal ticketPrice; //5.5 CETO
    address internal partner;
    uint256 internal initialGuaranteedPrizePool;
    uint256 internal period;
    uint256 internal startDate;

    uint256 internal countdownStartedAt = 0;
    address[] internal participants;
    uint256 internal participantsCount = 0;
    bool internal gameStarted = false;

    uint256 internal currentRebate = 0;

    address internal firstWinner;
    address internal secondWinner;
    address internal thirdWinner;

    uint256 internal commit = 0;
    uint256 constant BET_EXPIRATION_BLOCKS = 250;
    uint40 internal commitBlockNumber;

    /************mappings************/
    mapping(address => bool) public administrators;

    /*==============================
    =            EVENTS            =
    ==============================*/
    event onTicketPurchase(
        address indexed customerAddress,
        uint8 numberOfTickets
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
        if (msg.sender != contract_address) {
            revert();
        }
    }

    // This is an admin only function to set commit.
    // Commits are the Keccak256 hash of some secret "reveal" random number, to be supplied
    // by the bot in the settleBet transaction. Supplying
    // "commit" ensures that "reveal" cannot be changed behind the scenes
    //  after placeBet have been mined.

    function setCommit(uint256 commit_) public onlyAdministrator() {
        commit = commit_;
        commitBlockNumber = uint40(block.number);
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
    }

    //This is the method for user to buy tickets for the raffle
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

        //Maintain a list of participants
        //Run a for loop for multiple entries
        for (uint8 i = 0; i < numberOfTickets; i++) {
            participants.push(_customerAddress);
            participantsCount += 1;
        }

        //Check if totalCetoBalance is greater than or equal to GPP and the countdown hasn't been set yet
        if (
            getCurrentCETOBalance() >= initialGuaranteedPrizePool &&
            countdownStartedAt == 0
        ) {
            countdownStartedAt = block.timestamp;
            gameStarted = true;

            emit onGameStart(countdownStartedAt);
        }

        emit onTicketPurchase(_customerAddress, numberOfTickets);
    }

    // This is the method used to settle bets. settleBet should supply a "reveal" number
    // that would Keccak256-hash to "commit". "blockHash" is the block hash
    // of placeBet block as seen by croupier; it is additionally asserted to
    // prevent changing the bet outcomes on Ethereum reorgs.
    function declareResult(uint256 reveal) external onlyAdministrator() {
        require(
            countdownStartedAt + period <= block.timestamp,
            "Countdown hasn't finished yet"
        );
        require(
            getCurrentCETOBalance() >=
                mulDiv(initialGuaranteedPrizePool, 67, 100),
            "Insufficient amount"
        );

        //Check if the reveal is valid
        uint256 commit_ = uint256(keccak256(abi.encodePacked(reveal)));
        require(commit_ == commit, "Invaild reveal");

        // Check that bet has not expired yet (see comment to BET_EXPIRATION_BLOCKS).
        require(
            block.number > commitBlockNumber,
            "settleBet in the same block as placeBet, or before."
        );
        require(
            block.number <= commitBlockNumber + BET_EXPIRATION_BLOCKS,
            "Blockhash can't be queried by EVM."
        );
        // require(blockhash(commitBlockNumber) == blockHash);

        uint256 currentPoolFunds;
        uint256 nextPoolFunds;
        (currentPoolFunds, nextPoolFunds) = getFunds();

        // The RNG - combine "reveal" and blockhash of setCommit using Keccak256. Miners
        // are not aware of "reveal" and cannot deduce it from "commit",
        // and house is unable to alter the "reveal" after setCommit has been mined.
        bytes32 firstEntropy =
            keccak256(abi.encodePacked(reveal, blockhash(commitBlockNumber)));
        uint256 firstIndex = uint256(firstEntropy) % participantsCount;
        firstWinner = participants[firstIndex];

        bool runLoop = true;
        uint256 secondIndex;
        bytes32 secondEntropy;

        //Loop to avoid collisions
        while (secondIndex == firstIndex || runLoop) {
            secondEntropy = keccak256(abi.encodePacked(firstEntropy));
            secondIndex = uint256(secondEntropy) % participantsCount;
            runLoop = false;
        }
        secondWinner = participants[secondIndex];

        runLoop = true;
        uint256 thirdIndex;
        bytes32 thirdEntropy;

        //Loop to avoid collisions
        while (
            thirdIndex == secondIndex || thirdIndex == firstIndex || runLoop
        ) {
            thirdEntropy = keccak256(abi.encodePacked(secondEntropy));
            thirdIndex = uint256(thirdEntropy) % participantsCount;
            runLoop = false;
        }
        thirdWinner = participants[thirdIndex];

        //Calculate the prize money
        uint256 firstPrize;
        uint256 secondPrize;
        uint256 thirdPrize;
        (firstPrize, secondPrize, thirdPrize) = getPrizes();

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

        //Assign/Payout out the promotional partner
        success = CETO.transfer(partner, getPartnerPoolFunds());
        if (!success) {
            revert("Partner pool funds distribution failed");
        }

        // Resetting the data
        countdownStartedAt = 0;
        initialGuaranteedPrizePool = nextPoolFunds;
        delete participants;
        participantsCount = 0;
        gameStarted = false;
    }

    /*----------  READ ONLY FUNCTIONS  ----------*/
    function getCurrentCETOBalance() public view returns (uint256) {
        return CETO.myTokens();
    }

    function getCurrentCETODividends() public view returns (uint256) {
        return CETO.myDividends(true);
    }

    function getTicketPrice() public view returns (uint256) {
        return ticketPrice;
    }

    function getPeriod() public view returns (uint256) {
        return period;
    }

    function getParticipantsCount() public view returns (uint256) {
        return participantsCount;
    }

    function getStartDate() public view returns (uint256) {
        return startDate;
    }

    function getCountdownStartedAt() public view returns (uint256) {
        return countdownStartedAt;
    }

    function getGuaranteedPrizePool() public view returns (uint256) {
        return initialGuaranteedPrizePool;
    }

    function getProbabilityOfWinning() public view returns (uint256) {
        //Calculate probabilty
        uint256 probability = SafeMath.div(3, participantsCount);
        return probability;
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
        uint256 currentPoolFunds;
        uint256 nextPoolFunds;
        (currentPoolFunds, nextPoolFunds) = getFunds();

        //Calculate the prize money

        uint256 firstPrize = mulDiv(currentPoolFunds, 9, 13);
        uint256 secondPrize = mulDiv(currentPoolFunds, 3, 13);
        uint256 thirdPrize = mulDiv(currentPoolFunds, 1, 13);
        return (firstPrize, secondPrize, thirdPrize);
    }

    function getWinners()
        public
        view
        returns (
            address,
            address,
            address
        )
    {
        return (firstWinner, secondWinner, thirdWinner);
    }

    //CHECK
    function getPartnerPoolFunds() public view returns (uint256) {
        uint256 partnerPoolFunds_ = 0;

        //Calculate 67% of the amout collected
        uint256 minimumRequiredAmount =
            mulDiv(initialGuaranteedPrizePool, 67, 100);

        if (partner != address(0)) {
            //Check if the amount collected is atleast 67% of the initial GPP
            // if amount collected is less than 67% than the partner gets nothing
            // and all the amount goes to the prize pool
            // else 67% goes to the prize pool and the gets remaining 33% goes to the partner pool
            if (getCurrentCETOBalance() > minimumRequiredAmount) {
                partnerPoolFunds_ =
                    getCurrentCETOBalance() -
                    minimumRequiredAmount;
            }
            //Check if the amount collected is greater than the initial GPP
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

    //CHECK
    function getFunds() public view returns (uint256, uint256) {
        uint256 currentPrizePool;
        uint256 nextPoolFunds = 0;
        uint256 differenceAmount;

        //Calculate 67% of the amout collected
        uint256 minimumRequiredAmount =
            mulDiv(initialGuaranteedPrizePool, 67, 100);

        //Calculate the difference amount if amount collected is greater than the initial gpp
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
                nextPoolFunds += SafeMath.add(
                    nextPoolFunds,
                    SafeMath.div(differenceAmount, 2)
                );
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
                currentPrizePool = mulDiv(getCurrentCETOBalance(), 67, 100);
                //Check if the amount collected is greater than the initial GPP
                // if yes than 50% of the difference amount goes to partner pool,
                // 25% to the current prize pool and 25% to the next prize pool
                if (getCurrentCETOBalance() > initialGuaranteedPrizePool) {
                    currentPrizePool = SafeMath.add(
                        currentPrizePool,
                        SafeMath.div(differenceAmount, 4)
                    );
                    nextPoolFunds += SafeMath.add(
                        currentPrizePool,
                        SafeMath.div(differenceAmount, 4)
                    );
                }
            }
        }

        return (currentPrizePool, nextPoolFunds);
    }

    /*----------  ADMINISTRATOR ONLY FUNCTIONS  ----------*/

    function setAdministrator(address _identifier, bool _status)
        public
        onlyAdministrator()
    {
        administrators[_identifier] = _status;
    }

    /**
     * Reinvest function for the admin
     */
    function Reinvest(
        bool setUpAutoReinvest,
        uint24 period_,
        uint256 rewardPerInvocation,
        uint256 minimumDividendValue
    ) public onlyAdministrator() {
        CETO.reinvest(
            setUpAutoReinvest,
            period_,
            rewardPerInvocation,
            minimumDividendValue
        );
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
