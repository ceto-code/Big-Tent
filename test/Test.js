const ceto_json = require("../build/contracts/Hourglass.json");
const BigTent = artifacts.require("BigTent");
var randomBytes = require("crypto");
var web3 = require("web3");
var BN = require("bn.js");
var Web3 = require("web3");
var axios = require("axios");
const TronWeb = require("tronweb");
var precision = 1e6;
const tronWeb = new TronWeb({
    fullHost: "https://api.nileex.io",
    eventServer: "https://api.nileex.io",
    privateKey: process.env.PRIVATE_KEY_NILE,
});

contract("BigTent", accounts => {
    it("Buy 10 tickets with cost of each ticket as 1.1ceto , GPP = 9.9ceto - no partner", async() => {
        let amount = "100000000"; // 1 eth.
        let ticketPrice_ = 1100000;
        let partner_ = "0x0000000000000000000000000000000000000000"
        let gpp_ = 9900000;

        const ceto = await tronWeb
            .contract()
            .at("410e0e76ff0f7f9b22b2f9d47624c2f6ac5a4de54e");

        const contract = await BigTent.deployed();
        console.log(contract.address, accounts[0]);

        var tokens = await ceto.methods.myTokens().call({ from: accounts[0] });
        console.log("Initial tokens : ", tokens.toString());

        // disableInitialStage
        var disableInitialStage = await ceto.methods
            .disableInitialStage()
            .send({ from: accounts[0] });
        // console.log(disableInitialStage, "disableInitialStage");
        var onlyAmbassadors = await ceto.methods
            .onlyAmbassadors()
            .call({ from: accounts[0] });
        console.log("Ambassador Phase : ", onlyAmbassadors.toString());

        // Buy
        var buy_ = await ceto.methods
            .buy(accounts[0])
            .send({ from: accounts[0], callValue: amount });

        var tokens = await ceto.methods.myTokens().call({ from: accounts[0] });
        console.log("tokens : ", tokens.toString(), accounts[0]);

        // Approve
        var approve = await ceto.methods
            .approve(contract.address, parseInt(tokens.toString()))
            .send({ from: accounts[0] });

        var allowance = await ceto.methods
            .allowance(accounts[0], contract.address)
            .call({ from: accounts[0] });
        console.log("allowance : ", allowance.toString(), accounts[0]);

        // Start the game
        var startGame = await contract.startGame(
            ticketPrice_,
            partner_,
            gpp_,
            1,
            1618471930, { from: accounts[0] }
        );
        // console.log("startGame : ", startGame);
        console.log("Game started");

        var getEventData = await contract.getEventData({ from: accounts[0] });
        console.log("TIcket Price : ", getEventData[0].toString());
        var partner = await contract.partner.call();
        console.log("partner : ", partner.toString());
        var initialGuaranteedPrizePool = await contract.initialGuaranteedPrizePool.call();
        console.log(
            "initialGuaranteedPrizePool : ",
            initialGuaranteedPrizePool.toString()
        );
        var period = await contract.period.call();
        console.log("period : ", period.toString());
        var startDate = await contract.startDate.call();
        console.log("startDate : ", startDate.toString());
        var gameNumber = await contract.gameNumber.call();
        console.log("gameNumber : ", gameNumber.toString());
        var gameStarted = await contract.gameStarted.call();
        console.log("gameStarted : ", gameStarted.toString());
        var startingTronBalance = await contract.startingTronBalance.call();
        console.log("startingTronBalance : ", startingTronBalance.toString());
        var totalTronBalance = await contract.totalTronBalance({
            from: accounts[0],
        });
        console.log("totalTronBalance : ", totalTronBalance.toString());

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("getCurrentCETOBalance : ", getCurrentCETOBalance.toString());

        // Make multiple buys
        console.log("buying...");
        var buy1 = await contract.buyTicket(3, {
            from: accounts[0],
            feelimit: "4000000",
        });
        // console.log("buy1 : ", buy1);

        var myDividends = await ceto.methods
            .myDividends(true)
            .call({ from: accounts[0] });
        console.log("Initial myDividends : ", myDividends.toString());

        // Check values of the contract
        var participantsCount = await contract.participantsCount.call();
        console.log("participantsCount : ", participantsCount.toString());

        console.log("buying...");
        var buy2 = await contract.buyTicket(7, {
            from: accounts[0],
            feelimit: "4000000",
        });
        // console.log("buy2 : ", buy2);

        var myDividends = await ceto.methods
            .myDividends(true)
            .call({ from: contract.address });
        console.log("Initial myDividends : ", myDividends.toString());
        // Check values of the contract
        var participantsCount = await contract.participantsCount.call();
        console.log("participantsCount : ", participantsCount.toString());

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("getCurrentCETOBalance : ", getCurrentCETOBalance.toString());

        var getCursor = await contract.getCursor({
            from: accounts[0],
        });
        console.log(
            "getCursor : ",
            getCursor[0].toString(),
            getCursor[1].toString()
        );

        for (var i = 0; i < getCursor[1]; i++) {
            var TimestampedCETODeposits = await contract.TimestampedCETODeposits(i, {
                from: accounts[0],
            });
            console.log(
                "TimestampedCETODeposits : ",
                TimestampedCETODeposits[0].toString(),
                TimestampedCETODeposits[1].toString(),
                TimestampedCETODeposits[2].toString()
            );
        }

        var getRebateBalance = await contract.getRebateBalance({
            from: accounts[0],
        });
        console.log("Rebate Balance : ", getRebateBalance.toString());

    });

    it("Results", async() => {
        let amount = "1000000000000000000"; // 1 eth.
        let ticketPrice_ = 10000000000000;
        let partner_ = "0x0000000000000000000000000000000000000000";
        let gpp_ = 90000000000000;
        const contract = await BigTent.deployed();
        console.log(contract.address);
        const ceto = await tronWeb
            .contract()
            .at("410e0e76ff0f7f9b22b2f9d47624c2f6ac5a4de54e");
        var getEventData = await contract.getEventData({ from: accounts[0] });
        console.log("getEventData : ", getEventData[0].toString());
        var tokens1 = await ceto.methods.myTokens().call({ from: accounts[0] });
        //Generate a 256 bit random number - reveal
        const value = randomBytes.randomBytes(32); // 32 bytes = 256 bits
        const reveal = new BN(value.toString("hex"), 16);
        console.log("reveal : ", reveal.toString());
        //Hash reveal to get commit
        const commit = web3.utils.soliditySha3(reveal);
        console.log("commit : ", commit);
        //Send commit to the contract
        var setCommit = await contract.setCommit(commit, { from: accounts[0] });
        // console.log("Setting Commit : ", setCommit);
        var getCurrentCETOBalance_ = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("Current CETO Balance : ", getCurrentCETOBalance_.toString());
        var tokens1 = await ceto.methods.myTokens().call({ from: accounts[0] });
        console.log("Initial tokens : ", tokens1.toString());

        var getPartnerPoolFunds = await contract.getPartnerPoolFunds({
            from: accounts[0],
        });
        console.log(
            "Partner pool funds to be distributed : ",
            getPartnerPoolFunds.toString()
        );
        // Call the result function with the reveal
        var declareResult = await contract.declareResult(reveal.toString(), {
            from: accounts[0],
        });
        // console.log("Calculating results : ", declareResult);
        var getEventData = await contract.getEventData({ from: accounts[0] });
        console.log("resultsDeclared : ", getEventData[7].toString());
        var getWinners = await contract.getWinners({ from: accounts[0] });
        console.log(
            "getWinners : ",
            getWinners[0].toString(),
            getWinners[1].toString(),
            getWinners[2].toString()
        );
        var getPrizes = await contract.getPrizes({ from: accounts[0] });
        console.log(
            "getPrizes : ",
            getPrizes[0].toString(),
            getPrizes[1].toString(),
            getPrizes[2].toString()
        );
        var getWinnersIndex = await contract.getWinnersIndex({ from: accounts[0] });
        console.log(
            "getWinnersIndex : ",
            getWinnersIndex[0].toString(),
            getWinnersIndex[1].toString(),
            getWinnersIndex[2].toString()
        );
        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("Current CETO Balance : ", getCurrentCETOBalance.toString());
        var getGameResult = await contract.getGameResult(1, { from: accounts[0] });
        console.log(
            "getGameResult : ",
            getGameResult[0].toString(),
            getGameResult[1].toString()
        );

        var tokens2 = await ceto.methods.myTokens().call({ from: accounts[0] });
        var prize1 = (parseInt(getCurrentCETOBalance_) * 9) / 13;
        var prize2 = (parseInt(getCurrentCETOBalance_) * 3) / 13;
        var prize3 = (parseInt(getCurrentCETOBalance_) * 1) / 13;
        token_final =
            prize1 -
            prize1 / 10 +
            prize2 -
            prize2 / 10 +
            prize3 -
            prize3 / 10 +
            parseInt(tokens1);
        console.log("token_final : ", token_final);

        console.log("Resetting game");
        var resetGame = await contract.resetGame({
            from: accounts[0],
        });
        // console.log("Reset : ", resetGame);
        console.log("Game ended");

        var myDividends = await ceto.methods
            .myDividends(true)
            .call({ from: contract.address });
        console.log("Initial myDividends : ", myDividends.toString());
        var getCursor = await contract.getCursor({
            from: accounts[0],
        });
        console.log(
            "getCursor : ",
            getCursor[0].toString(),
            getCursor[1].toString()
        );

        for (var i = 0; i < getCursor[1]; i++) {
            var TimestampedCETODeposits = await contract.TimestampedCETODeposits(i, {
                from: accounts[0],
            });
            console.log(
                "TimestampedCETODeposits : ",
                TimestampedCETODeposits[0].toString(),
                TimestampedCETODeposits[1].toString(),
                TimestampedCETODeposits[2].toString()
            );
        }
        var getRebateBalance = await contract.getRebateBalance({
            from: accounts[0],
        });
        console.log("Rebate Balance : ", getRebateBalance.toString());

        var myDividends = await ceto.methods
            .myDividends(true)
            .call({ from: contract.address });
        console.log("Final myDividends : ", myDividends.toString());
        assert(
            parseInt(prize1) == getPrizes[0].toString(),
            "1st prize miscalculated"
        );
        assert(parseInt(prize2) == getPrizes[1], "2nd prize miscalculated");
        assert(parseInt(prize3) == getPrizes[2], "3rd prize miscalculated");
        assert(
            parseInt(token_final / 1e6) ==
            parseInt(parseInt(tokens2.toString()) / 1e6),
            "Distribution failed"
        );
    });

    it("Buy 10 tickets with cost of each ticket as 1.1ceto , GPP = 9.9ceto - with partner", async() => {
        let amount = "100000000"; // 1 eth.
        let ticketPrice_ = 1100000;
        let partner_ = "TNe47m8DoLPRqD8k4UrixDYd3X3kNkZP8J"
        let gpp_ = 9900000;

        const ceto = await tronWeb
            .contract()
            .at("410e0e76ff0f7f9b22b2f9d47624c2f6ac5a4de54e");

        const contract = await BigTent.deployed();
        console.log(contract.address, accounts[0]);

        var tokens = await ceto.methods.myTokens().call({ from: accounts[0] });
        console.log("Initial tokens : ", tokens.toString());

        // disableInitialStage
        var disableInitialStage = await ceto.methods
            .disableInitialStage()
            .send({ from: accounts[0] });
        // console.log(disableInitialStage, "disableInitialStage");
        var onlyAmbassadors = await ceto.methods
            .onlyAmbassadors()
            .call({ from: accounts[0] });
        console.log("Ambassador Phase : ", onlyAmbassadors.toString());

        // Buy
        // var buy_ = await ceto.methods
        //     .buy(accounts[0])
        //     .send({ from: accounts[0], callValue: amount });

        var tokens = await ceto.methods.myTokens().call({ from: accounts[0] });
        console.log("tokens : ", tokens.toString(), accounts[0]);

        // Approve
        var approve = await ceto.methods
            .approve(contract.address, parseInt(tokens.toString()))
            .send({ from: accounts[0] });

        var allowance = await ceto.methods
            .allowance(accounts[0], contract.address)
            .call({ from: accounts[0] });
        console.log("allowance : ", allowance.toString(), accounts[0]);

        // Start the game
        var startGame = await contract.startGame(
            ticketPrice_,
            partner_,
            gpp_,
            1,
            1618471930, { from: accounts[0] }
        );
        // console.log("startGame : ", startGame);
        console.log("Game started");

        var getEventData = await contract.getEventData({ from: accounts[0] });
        console.log("TIcket Price : ", getEventData[0].toString());
        var partner = await contract.partner.call();
        console.log("partner : ", partner.toString());
        var initialGuaranteedPrizePool = await contract.initialGuaranteedPrizePool.call();
        console.log(
            "initialGuaranteedPrizePool : ",
            initialGuaranteedPrizePool.toString()
        );
        var period = await contract.period.call();
        console.log("period : ", period.toString());
        var startDate = await contract.startDate.call();
        console.log("startDate : ", startDate.toString());
        var gameNumber = await contract.gameNumber.call();
        console.log("gameNumber : ", gameNumber.toString());
        var gameStarted = await contract.gameStarted.call();
        console.log("gameStarted : ", gameStarted.toString());
        var startingTronBalance = await contract.startingTronBalance.call();
        console.log("startingTronBalance : ", startingTronBalance.toString());
        var totalTronBalance = await contract.totalTronBalance({
            from: accounts[0],
        });
        console.log("totalTronBalance : ", totalTronBalance.toString());

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("getCurrentCETOBalance : ", getCurrentCETOBalance.toString());

        // Make multiple buys
        console.log("buying...");
        var buy1 = await contract.buyTicket(3, {
            from: accounts[0],
            feelimit: "4000000",
        });
        // console.log("buy1 : ", buy1);

        var myDividends = await ceto.methods
            .myDividends(true)
            .call({ from: accounts[0] });
        console.log("Initial myDividends : ", myDividends.toString());

        // Check values of the contract
        var participantsCount = await contract.participantsCount.call();
        console.log("participantsCount : ", participantsCount.toString());

        console.log("buying...");
        var buy2 = await contract.buyTicket(7, {
            from: accounts[0],
            feelimit: "4000000",
        });
        // console.log("buy2 : ", buy2);

        var myDividends = await ceto.methods
            .myDividends(true)
            .call({ from: contract.address });
        console.log("Initial myDividends : ", myDividends.toString());
        // Check values of the contract
        var participantsCount = await contract.participantsCount.call();
        console.log("participantsCount : ", participantsCount.toString());

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("getCurrentCETOBalance : ", getCurrentCETOBalance.toString());

        var getCursor = await contract.getCursor({
            from: accounts[0],
        });
        console.log(
            "getCursor : ",
            getCursor[0].toString(),
            getCursor[1].toString()
        );

        for (var i = 0; i < getCursor[1]; i++) {
            var TimestampedCETODeposits = await contract.TimestampedCETODeposits(i, {
                from: accounts[0],
            });
            console.log(
                "TimestampedCETODeposits : ",
                TimestampedCETODeposits[0].toString(),
                TimestampedCETODeposits[1].toString(),
                TimestampedCETODeposits[2].toString()
            );
        }

        var getRebateBalance = await contract.getRebateBalance({
            from: accounts[0],
        });
        console.log("Rebate Balance : ", getRebateBalance.toString());

    });

    it("Results for case2", async() => {
        const contract = await BigTent.deployed();
        console.log(contract.address);
        const ceto = await tronWeb
            .contract()
            .at("410e0e76ff0f7f9b22b2f9d47624c2f6ac5a4de54e");
        var getEventData = await contract.getEventData({ from: accounts[0] });

        //Generate a 256 bit random number - reveal
        const value = randomBytes.randomBytes(32); // 32 bytes = 256 bits
        const reveal = new BN(value.toString("hex"), 16);
        console.log("reveal : ", reveal.toString());

        //Hash reveal to get commit
        const commit = web3.utils.soliditySha3(reveal);
        console.log("commit : ", commit);

        //Send commit to the contract
        console.log("Setting Commit ");
        var setCommit = await contract.setCommit(commit, { from: accounts[0] });
        // console.log("Setting Commit : ", setCommit);

        var getCurrentCETOBalance_ = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("Current CETO Balance : ", getCurrentCETOBalance_.toString());

        var tokens1 = await ceto.myTokens().call({ from: accounts[0] });
        console.log("Initial user tokens", tokens1.toString())
        var getPartnerPoolFunds = await contract.getPartnerPoolFunds({
            from: accounts[0],
        });

        var getPrizes = await contract.getPrizes({ from: accounts[0] });
        console.log(
            "getPrizes : ",
            getPrizes[0].toString(),
            getPrizes[1].toString(),
            getPrizes[2].toString()
        );
        var partner_tokens = await ceto
            .myTokens()
            .call({ from: "TNe47m8DoLPRqD8k4UrixDYd3X3kNkZP8J" });
        console.log("Initial Partner tokens : ", partner_tokens.toString());

        // //Call the result function with the reveal
        var declareResult = await contract.declareResult(reveal.toString(), {
            from: accounts[0],
        });
        console.log("results declared:", declareResult)


        var getEventData = await contract.getEventData({ from: accounts[0] });
        console.log("resultsDeclared : ", getEventData[7]);

        var getWinners = await contract.getWinners({ from: accounts[0] });
        console.log(
            "getWinners : ",
            getWinners[0].toString(),
            getWinners[1].toString(),
            getWinners[2].toString()
        );


        var getWinnersIndex = await contract.getWinnersIndex({ from: accounts[0] });
        console.log(
            "getWinnersIndex : ",
            getWinnersIndex[0].toString(),
            getWinnersIndex[1].toString(),
            getWinnersIndex[2].toString()
        );

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("Current CETO Balance : ", getCurrentCETOBalance.toString());

        getCurrentCETOBalance_67 = (parseInt(getCurrentCETOBalance_) * 2) / 3;
        getCurrentCETOBalance_33 = (parseInt(getCurrentCETOBalance_) * 1) / 3;

        var prize1 = (parseInt(getCurrentCETOBalance_67) * 9) / 13;
        var prize2 = (parseInt(getCurrentCETOBalance_67) * 3) / 13;
        var prize3 = (parseInt(getCurrentCETOBalance_67) * 1) / 13;
        var partner_tokens_expected =
            getCurrentCETOBalance_33 -
            getCurrentCETOBalance_33 / 10 +
            parseInt(partner_tokens);

        var partner_tokens = await ceto
            .myTokens()
            .call({ from: "TNe47m8DoLPRqD8k4UrixDYd3X3kNkZP8J" });
        console.log("Partner tokens final : ", partner_tokens.toString())
        token_final =
            prize1 -
            prize1 / 10 +
            prize2 -
            prize2 / 10 +
            prize3 -
            prize3 / 10 +
            parseInt(tokens1);
        var tokens2 = await ceto.myTokens().call({ from: accounts[0] });
        console.log("Final user tokens", tokens2.toString())
            // console.log(
            //     parseInt(token_final / 1e6),
            //     parseInt(parseInt(tokens2.toString()) / 1e6),
            //     "Distribution failed"
            // );
            // Error : token_final ~  tokens2
        console.log("Resetting game");
        var resetGame = await contract.resetGame({
            from: accounts[0],
        });
        assert(parseInt(prize1) == getPrizes[0], "1st prize miscalculated");
        assert(parseInt(prize2) == getPrizes[1], "2nd prize miscalculated");
        assert(parseInt(prize3) == getPrizes[2], "3rd prize miscalculated");
        assert(
            partner_tokens_expected == partner_tokens,
            "partner prize miscalculated"
        );
        assert(
            parseInt(token_final / 1e6) ==
            parseInt(parseInt(tokens2.toString()) / 1e6),
            "Distribution failed"
        );

        assert(getEventData[7] == true, "Result declaration failed");
    });
    it("Buy 11 tickets with cost of each ticket as 1.1ceto , GPP = 9.9ceto - no partner", async() => {
        let amount = "100000000"; // 1 eth.
        let ticketPrice_ = 1100000;
        let partner_ = "0x0000000000000000000000000000000000000000"
        let gpp_ = 9900000;

        const ceto = await tronWeb
            .contract()
            .at("410e0e76ff0f7f9b22b2f9d47624c2f6ac5a4de54e");

        const contract = await BigTent.deployed();
        console.log(contract.address, accounts[0]);

        var tokens = await ceto.methods.myTokens().call({ from: accounts[0] });
        console.log("Initial tokens : ", tokens.toString());

        // disableInitialStage
        var disableInitialStage = await ceto.methods
            .disableInitialStage()
            .send({ from: accounts[0] });
        // console.log(disableInitialStage, "disableInitialStage");
        var onlyAmbassadors = await ceto.methods
            .onlyAmbassadors()
            .call({ from: accounts[0] });
        console.log("Ambassador Phase : ", onlyAmbassadors.toString());

        // Buy
        // var buy_ = await ceto.methods
        //     .buy(accounts[0])
        //     .send({ from: accounts[0], callValue: amount });

        var tokens = await ceto.methods.myTokens().call({ from: accounts[0] });
        console.log("tokens : ", tokens.toString(), accounts[0]);

        // Approve
        var approve = await ceto.methods
            .approve(contract.address, parseInt(tokens.toString()))
            .send({ from: accounts[0] });

        var allowance = await ceto.methods
            .allowance(accounts[0], contract.address)
            .call({ from: accounts[0] });
        console.log("allowance : ", allowance.toString(), accounts[0]);

        // Start the game
        var startGame = await contract.startGame(
            ticketPrice_,
            partner_,
            gpp_,
            1,
            1618471930, { from: accounts[0] }
        );
        // console.log("startGame : ", startGame);
        console.log("Game started");

        var getEventData = await contract.getEventData({ from: accounts[0] });
        console.log("TIcket Price : ", getEventData[0].toString());
        var partner = await contract.partner.call();
        console.log("partner : ", partner.toString());
        var initialGuaranteedPrizePool = await contract.initialGuaranteedPrizePool.call();
        console.log(
            "initialGuaranteedPrizePool : ",
            initialGuaranteedPrizePool.toString()
        );
        var period = await contract.period.call();
        console.log("period : ", period.toString());
        var startDate = await contract.startDate.call();
        console.log("startDate : ", startDate.toString());
        var gameNumber = await contract.gameNumber.call();
        console.log("gameNumber : ", gameNumber.toString());
        var gameStarted = await contract.gameStarted.call();
        console.log("gameStarted : ", gameStarted.toString());
        var startingTronBalance = await contract.startingTronBalance.call();
        console.log("startingTronBalance : ", startingTronBalance.toString());
        var totalTronBalance = await contract.totalTronBalance({
            from: accounts[0],
        });
        console.log("totalTronBalance : ", totalTronBalance.toString());

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("getCurrentCETOBalance : ", getCurrentCETOBalance.toString());

        // Make multiple buys
        console.log("buying...");
        var buy1 = await contract.buyTicket(4, {
            from: accounts[0],
            feelimit: "4000000",
        });
        // console.log("buy1 : ", buy1);

        var myDividends = await ceto.methods
            .myDividends(true)
            .call({ from: accounts[0] });
        console.log("Initial myDividends : ", myDividends.toString());

        // Check values of the contract
        var participantsCount = await contract.participantsCount.call();
        console.log("participantsCount : ", participantsCount.toString());

        console.log("buying...");
        var buy2 = await contract.buyTicket(7, {
            from: accounts[0],
            feelimit: "4000000",
        });
        // console.log("buy2 : ", buy2);

        var myDividends = await ceto.methods
            .myDividends(true)
            .call({ from: contract.address });
        console.log("Initial myDividends : ", myDividends.toString());
        // Check values of the contract
        var participantsCount = await contract.participantsCount.call();
        console.log("participantsCount : ", participantsCount.toString());

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("getCurrentCETOBalance : ", getCurrentCETOBalance.toString());

        var getCursor = await contract.getCursor({
            from: accounts[0],
        });
        console.log(
            "getCursor : ",
            getCursor[0].toString(),
            getCursor[1].toString()
        );

        for (var i = 0; i < getCursor[1]; i++) {
            var TimestampedCETODeposits = await contract.TimestampedCETODeposits(i, {
                from: accounts[0],
            });
            console.log(
                "TimestampedCETODeposits : ",
                TimestampedCETODeposits[0].toString(),
                TimestampedCETODeposits[1].toString(),
                TimestampedCETODeposits[2].toString()
            );
        }

        var getRebateBalance = await contract.getRebateBalance({
            from: accounts[0],
        });
        console.log("Rebate Balance : ", getRebateBalance.toString());

    });

    it("Results for case3", async() => {
        const contract = await BigTent.deployed();
        console.log(contract.address);
        const ceto = await tronWeb
            .contract()
            .at("410e0e76ff0f7f9b22b2f9d47624c2f6ac5a4de54e");
        var getEventData = await contract.getEventData({ from: accounts[0] });

        var tokens1 = await ceto.myTokens().call({ from: accounts[0] });

        //Generate a 256 bit random number - reveal
        const value = randomBytes.randomBytes(32); // 32 bytes = 256 bits
        const reveal = new BN(value.toString("hex"), 16);
        console.log("reveal : ", reveal.toString());

        //Hash reveal to get commit
        const commit = web3.utils.soliditySha3(reveal);
        console.log("commit : ", commit);

        //Send commit to the contract
        console.log("Setting Commit : ");
        var setCommit = await contract.setCommit(commit, { from: accounts[0] });
        // console.log("Setting Commit : ", setCommit);

        var getCurrentCETOBalance_ = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("Current CETO Balance : ", getCurrentCETOBalance_.toString());

        var getPrizes = await contract.getPrizes({ from: accounts[0] });

        var initial_gpp = parseInt(getEventData[2].toString());
        var nextPoolFunds = (getCurrentCETOBalance_ - initial_gpp) / 2;
        console.log("nextPoolFunds expected : ", nextPoolFunds);
        var getCurrentPoolFunds_ = await contract.getFunds({ from: accounts[0] });
        var getCurrentPoolFunds =
            initial_gpp +
            (parseInt(getCurrentCETOBalance_.toString()) - initial_gpp) / 2;

        console.log(
            "Current pool funds actual : ",
            getCurrentPoolFunds_.toString(),
            "Current pool funds expected : ",
            getCurrentPoolFunds
        );
        var getPrizes = await contract.getPrizes({ from: accounts[0] });
        var prize1 = (parseInt(getCurrentPoolFunds) * 9) / 13;
        var prize2 = (parseInt(getCurrentPoolFunds) * 3) / 13;
        var prize3 = (parseInt(getCurrentPoolFunds) * 1) / 13;
        token_final =
            prize1 -
            prize1 / 10 +
            prize2 -
            prize2 / 10 +
            prize3 -
            prize3 / 10 +
            parseInt(tokens1);

        // //Call the result function with the reveal
        var declareResult = await contract.declareResult(reveal.toString(), {
            from: accounts[0],
        });
        console.log(declareResult)
        console.log("_____FINAL____");
        var tokens2 = await ceto.myTokens().call({ from: accounts[0] });
        console.log("tokens final : ", tokens2.toString());

        var getEventData = await contract.getEventData({ from: accounts[0] });
        console.log("resultsDeclared : ", getEventData[7]);

        var getWinners = await contract.getWinners({ from: accounts[0] });
        console.log(
            "getWinners : ",
            getWinners[0].toString(),
            getWinners[1].toString(),
            getWinners[2].toString()
        );

        var getWinnersIndex = await contract.getWinnersIndex({ from: accounts[0] });
        console.log("getWinnersIndex : ", getWinnersIndex.toString());

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("nextPoolFunds : ", getCurrentCETOBalance.toString());

        console.log("Resetting game");
        var resetGame = await contract.resetGame({
            from: accounts[0],
        });
        // console.log("Reset : ", resetGame);
        // console.log(parseInt(token_final / 1e6),
        //     parseInt(parseInt(tokens2.toString()) / 1e6))
        console.log("Game ended");
        assert(
            parseInt(prize1) == parseInt(getPrizes[0].toString()),
            "1st prize miscalculated"
        );
        assert(
            parseInt(prize2) == parseInt(getPrizes[1].toString()),
            "2nd prize miscalculated"
        );
        assert(
            parseInt(prize3) == parseInt(getPrizes[2].toString()),
            "3rd prize miscalculated"
        );
        assert(
            parseInt(token_final / 1e6) ==
            parseInt(parseInt(tokens2.toString()) / 1e6),
            "Distribution failed"
        );
        assert(
            parseInt(getCurrentCETOBalance / 1e6) ==
            parseInt(parseInt(nextPoolFunds.toString()) / 1e6),
            "Next pool funds mis calculated"
        );

        assert(getEventData[7] == true, "Result declaration failed");
    });

    it("Buy 11 tickets with cost of each ticket as 1.1ceto , GPP = 9.9ceto - with partner", async() => {
        let amount = "100000000"; // 1 eth.
        let ticketPrice_ = 1100000;
        let partner_ = "TNe47m8DoLPRqD8k4UrixDYd3X3kNkZP8J"
        let gpp_ = 9900000;

        const ceto = await tronWeb
            .contract()
            .at("410e0e76ff0f7f9b22b2f9d47624c2f6ac5a4de54e");

        const contract = await BigTent.deployed();
        console.log(contract.address, accounts[0]);

        var tokens = await ceto.methods.myTokens().call({ from: accounts[0] });
        console.log("Initial tokens : ", tokens.toString());

        // disableInitialStage
        var disableInitialStage = await ceto.methods
            .disableInitialStage()
            .send({ from: accounts[0] });
        // console.log(disableInitialStage, "disableInitialStage");
        var onlyAmbassadors = await ceto.methods
            .onlyAmbassadors()
            .call({ from: accounts[0] });
        console.log("Ambassador Phase : ", onlyAmbassadors.toString());

        // Buy
        // var buy_ = await ceto.methods
        //     .buy(accounts[0])
        //     .send({ from: accounts[0], callValue: amount });

        var tokens = await ceto.methods.myTokens().call({ from: accounts[0] });
        console.log("tokens : ", tokens.toString(), accounts[0]);

        // Approve
        var approve = await ceto.methods
            .approve(contract.address, parseInt(tokens.toString()))
            .send({ from: accounts[0] });

        var allowance = await ceto.methods
            .allowance(accounts[0], contract.address)
            .call({ from: accounts[0] });
        console.log("allowance : ", allowance.toString(), accounts[0]);

        // Start the game
        var startGame = await contract.startGame(
            ticketPrice_,
            partner_,
            gpp_,
            1,
            1618471930, { from: accounts[0] }
        );
        // console.log("startGame : ", startGame);
        console.log("Game started");

        var getEventData = await contract.getEventData({ from: accounts[0] });
        console.log("TIcket Price : ", getEventData[0].toString());
        var partner = await contract.partner.call();
        console.log("partner : ", partner.toString());
        var initialGuaranteedPrizePool = await contract.initialGuaranteedPrizePool.call();
        console.log(
            "initialGuaranteedPrizePool : ",
            initialGuaranteedPrizePool.toString()
        );
        var period = await contract.period.call();
        console.log("period : ", period.toString());
        var startDate = await contract.startDate.call();
        console.log("startDate : ", startDate.toString());
        var gameNumber = await contract.gameNumber.call();
        console.log("gameNumber : ", gameNumber.toString());
        var gameStarted = await contract.gameStarted.call();
        console.log("gameStarted : ", gameStarted.toString());
        var startingTronBalance = await contract.startingTronBalance.call();
        console.log("startingTronBalance : ", startingTronBalance.toString());
        var totalTronBalance = await contract.totalTronBalance({
            from: accounts[0],
        });
        console.log("totalTronBalance : ", totalTronBalance.toString());

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("getCurrentCETOBalance : ", getCurrentCETOBalance.toString());

        // Make multiple buys
        console.log("buying...");
        var buy1 = await contract.buyTicket(4, {
            from: accounts[0],
            feelimit: "4000000",
        });
        // console.log("buy1 : ", buy1);

        var myDividends = await ceto.methods
            .myDividends(true)
            .call({ from: accounts[0] });
        console.log("Initial myDividends : ", myDividends.toString());

        // Check values of the contract
        var participantsCount = await contract.participantsCount.call();
        console.log("participantsCount : ", participantsCount.toString());

        console.log("buying...");
        var buy2 = await contract.buyTicket(7, {
            from: accounts[0],
            feelimit: "4000000",
        });
        // console.log("buy2 : ", buy2);

        var myDividends = await ceto.methods
            .myDividends(true)
            .call({ from: contract.address });
        console.log("Initial myDividends : ", myDividends.toString());
        // Check values of the contract
        var participantsCount = await contract.participantsCount.call();
        console.log("participantsCount : ", participantsCount.toString());

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("getCurrentCETOBalance : ", getCurrentCETOBalance.toString());

        var getCursor = await contract.getCursor({
            from: accounts[0],
        });
        console.log(
            "getCursor : ",
            getCursor[0].toString(),
            getCursor[1].toString()
        );

        for (var i = 0; i < getCursor[1]; i++) {
            var TimestampedCETODeposits = await contract.TimestampedCETODeposits(i, {
                from: accounts[0],
            });
            console.log(
                "TimestampedCETODeposits : ",
                TimestampedCETODeposits[0].toString(),
                TimestampedCETODeposits[1].toString(),
                TimestampedCETODeposits[2].toString()
            );
        }

        var getRebateBalance = await contract.getRebateBalance({
            from: accounts[0],
        });
        console.log("Rebate Balance : ", getRebateBalance.toString());

    });
    it("Results for case4", async() => {
        const contract = await BigTent.deployed();
        console.log(contract.address);
        const ceto = await tronWeb
            .contract()
            .at("410e0e76ff0f7f9b22b2f9d47624c2f6ac5a4de54e");
        var getEventData = await contract.getEventData({ from: accounts[0] });
        console.log("getEventData : ", getEventData.toString());

        var tokens1 = await ceto.myTokens().call({ from: accounts[0] });

        //Generate a 256 bit random number - reveal
        const value = randomBytes.randomBytes(32); // 32 bytes = 256 bits
        const reveal = new BN(value.toString("hex"), 16);
        console.log("reveal : ", reveal.toString());

        //Hash reveal to get commit
        const commit = web3.utils.soliditySha3(reveal);
        console.log("commit : ", commit);

        //Send commit to the contract
        console.log("Setting Commit : ");
        var setCommit = await contract.setCommit(commit, { from: accounts[0] });
        //   console.log("Setting Commit : ", setCommit);

        var getCurrentCETOBalance_ = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("Current CETO Balance : ", getCurrentCETOBalance_.toString());

        var getPartnerPoolFunds = await contract.getPartnerPoolFunds({
            from: accounts[0],
        });
        var getFunds = await contract.getFunds({
            from: accounts[0],
        });
        console.log(
            "Current pool funds calculated by contract : ",
            getFunds.toString()
        );

        console.log(
            "Partner Pool Funds calculated by contract : ",
            getPartnerPoolFunds.toString()
        );

        var getPrizes = await contract.getPrizes({ from: accounts[0] });

        var initial_gpp = parseInt(getEventData[2].toString());
        getCurrentCETOBalance_67 = (initial_gpp * 2) / 3;
        getCurrentCETOBalance_33 = (initial_gpp * 1) / 3;
        var nextPoolFunds = (getCurrentCETOBalance_ - initial_gpp) / 4;

        var getCurrentPoolFunds =
            getCurrentCETOBalance_67 + (getCurrentCETOBalance_ - initial_gpp) / 4;
        getFunds = getFunds.toString();
        var prize1 = (parseInt(getFunds) * 9) / 13;
        var prize2 = (parseInt(getFunds) * 3) / 13;
        var prize3 = (parseInt(getFunds) * 1) / 13;
        token_final =
            prize1 -
            prize1 / 10 +
            prize2 -
            prize2 / 10 +
            prize3 -
            prize3 / 10 +
            parseInt(tokens1);
        console.log("Final tokens expected after winning : ", token_final);

        var partner_tokens = await ceto
            .myTokens()
            .call({ from: accounts[0] });

        var partner_tokens_expected =
            getCurrentCETOBalance_33 + (getCurrentCETOBalance_ - initial_gpp) / 2;

        partner_tokens_expected =
            partner_tokens_expected -
            partner_tokens_expected / 10 +
            parseInt(partner_tokens.toString());
        console.log("partner_tokens_expected : ", partner_tokens_expected);

        // //Call the result function with the reveal
        var declareResult = await contract.declareResult(reveal.toString(), {
            from: accounts[0],
        });
        var tokens2 = await ceto.myTokens().call({ from: accounts[0] });
        console.log("tokens final : ", tokens2.toString());

        var getEventData = await contract.getEventData({ from: accounts[0] });
        console.log("resultsDeclared : ", getEventData[7]);

        var getWinners = await contract.getWinners({ from: accounts[0] });
        console.log(
            "getWinners : ",
            getWinners[0].toString(),
            getWinners[1].toString(),
            getWinners[2].toString()
        );

        var getPrizes1 = await contract.getPrizes({ from: accounts[0] });
        console.log(
            "getPrizes : ",
            getPrizes1[0].toString(),
            getPrizes1[1].toString(),
            getPrizes1[2].toString()
        );
        var getWinnersIndex = await contract.getWinnersIndex({ from: accounts[0] });
        console.log(
            "getWinnersIndex : ",
            getWinnersIndex[0].toString(),
            getWinnersIndex[1].toString(),
            getWinnersIndex[2].toString()
        );
        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });

        console.log("nextPoolFunds : ", getCurrentCETOBalance.toString());

        var partner_tokens = await ceto.methods
            .myTokens()
            .call({ from: accounts[0] });

        console.log("Resetting game");
        var resetGame = await contract.resetGame({
            from: accounts[0],
        });
        // Error : token_final ~  tokens2
        assert(
            parseInt(prize1) == parseInt(getPrizes[0].toString()),
            "1st prize miscalculated"
        );
        assert(
            parseInt(prize2) == parseInt(getPrizes[1].toString()),
            "2nd prize miscalculated"
        );
        assert(
            parseInt(prize3) == parseInt(getPrizes[2].toString()),
            "3rd prize miscalculated"
        );
        assert(
            parseInt(token_final / 1e6) ==
            parseInt(parseInt(tokens2.toString()) / 1e6),
            "Distribution failed"
        );
        assert(
            parseInt(getCurrentCETOBalance / 1e6) ==
            parseInt(parseInt(nextPoolFunds.toString()) / 1e6),
            "Next pool funds mis calculated"
        );
        assert(
            partner_tokens_expected == parseInt(partner_tokens.toString()),
            "partner prize miscalculated"
        );

        assert(getEventData[7] == true, "Result declaration failed");
    });

    it("Buy using Tron", async() => {
        let amount = "100000000"; // 1 eth.
        let ticketPrice_ = 1100000;
        let partner_ = "0x0000000000000000000000000000000000000000";
        let gpp_ = 9900000;

        const ceto = await tronWeb
            .contract()
            .at("410e0e76ff0f7f9b22b2f9d47624c2f6ac5a4de54e");
        const contract = await BigTent.deployed();
        console.log(contract.address, accounts[0]);

        var tokens = await ceto.methods.myTokens().call({ from: accounts[0] });
        console.log("Initial tokens : ", tokens.toString());

        // disableInitialStage
        var disableInitialStage = await ceto.methods
            .disableInitialStage()
            .send({ from: accounts[0] });
        // console.log(disableInitialStage, "disableInitialStage");
        var onlyAmbassadors = await ceto.methods
            .onlyAmbassadors()
            .call({ from: accounts[0] });
        console.log("Ambassador Phase : ", onlyAmbassadors.toString());

        // // Buy
        // var buy_ = await ceto.methods
        //     .buy(accounts[0])
        //     .send({ from: accounts[0], callValue: amount });
        // console.log(buy_, "buy_");

        var tokens = await ceto.methods.myTokens().call({ from: accounts[0] });
        console.log("tokens", tokens.toString(), accounts[0]);



        // Start the game
        var startGame = await contract.startGame(
            ticketPrice_,
            partner_,
            gpp_,
            1,
            1618471930, { from: accounts[0] }
        );
        // console.log("startGame : ", startGame);
        console.log("Game started");

        var getEventData = await contract.ticketPrice.call();
        console.log("TIcket Price : ", getEventData.toString());
        var partner = await contract.partner.call();
        console.log("partner : ", partner.toString());
        var initialGuaranteedPrizePool = await contract.initialGuaranteedPrizePool.call();
        console.log(
            "initialGuaranteedPrizePool : ",
            initialGuaranteedPrizePool.toString()
        );
        var period = await contract.period.call();
        console.log("period : ", period.toString());
        var startDate = await contract.startDate.call();
        console.log("startDate : ", startDate.toString());
        var gameNumber = await contract.gameNumber.call();
        console.log("gameNumber : ", gameNumber.toString());
        var gameStarted = await contract.gameStarted.call();
        console.log("gameStarted : ", gameStarted.toString());
        var startingTronBalance = await contract.startingTronBalance.call();
        console.log("startingTronBalance : ", startingTronBalance.toString());
        var totalTronBalance = await contract.totalTronBalance({
            from: accounts[0],
        });
        console.log("totalTronBalance : ", totalTronBalance.toString());

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("getCurrentCETOBalance : ", getCurrentCETOBalance.toString());
        // Make multiple buys
        var numberOfTickets = 1;
        var config = {
            method: "get",
            url: `https://api.crystalelephant.net/api/buyprice/?cetoValue=${ticketPrice_}&contract_address=TBFXnn7SPgcdpn9pGxkSRXjvDkL1b4sv3z`,
            headers: {},
        };
        var cetoPrice
        await axios(config)
            .then(function(response) {
                console.log(JSON.stringify(response.data));
                cetoPrice = parseFloat(JSON.stringify(response.data.data)).toFixed(6) * 1e6;
                cetoPrice = parseInt(parseInt(cetoPrice) + parseInt(cetoPrice) / 10)
            })
            .catch(function(error) {
                console.log(error);
            });
        // var cetoPrice = await ceto.methods.buyPrice().call({ from: accounts[0] });
        console.log("cetoPrice : ", cetoPrice);

        var calculateTokensReceived = await ceto.methods
            .calculateTokensReceived(cetoPrice)
            .call({ from: accounts[0] });
        console.log(
            "ceto Tokens Received : ",
            calculateTokensReceived.toString(accounts[0])
        );

        var tokens = await ceto.methods.myTokens().call({ from: accounts[0] });
        console.log("Initial tokens of user", tokens.toString(), accounts[0]);
        var buy_ = await contract.buyTicketWithTron(numberOfTickets, {
            from: accounts[0],
            callValue: parseInt(cetoPrice),
            feeLimit: 100000000
        });
        console.log("buy_ : ", buy_);
        var tokensFinal = await ceto.methods.myTokens().call({ from: accounts[0] });
        console.log("Final tokens of user", tokensFinal.toString(), accounts[0]);

        var myDividends = await ceto.methods
            .myDividends(true)
            .call({ from: accounts[0] });
        console.log("Initial myDividends : ", myDividends.toString());

        // Check values of the contract
        var participantsCount = await contract.participantsCount.call();
        console.log("participantsCount : ", participantsCount.toString());

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("getCurrentCETOBalance : ", getCurrentCETOBalance.toString());

        var tokensToTransfer =
            parseInt(calculateTokensReceived.toString()) -
            parseInt(initialGuaranteedPrizePool.toString());
        tokensToTransfer = tokensToTransfer - tokensToTransfer / 10;

        var expectedUserCeto = tokensToTransfer + parseInt(tokens.toString());
        var getCursor = await contract.getCursor({
            from: accounts[0],
        });
        console.log(
            "getCursor : ",
            getCursor[0].toString(),
            getCursor[1].toString()
        );

        for (var i = 0; i < getCursor[1]; i++) {
            var TimestampedCETODeposits = await contract.TimestampedCETODeposits(i, {
                from: accounts[0],
            });
            console.log(
                "TimestampedCETODeposits : ",
                TimestampedCETODeposits[0].toString(),
                TimestampedCETODeposits[1].toString(),
                TimestampedCETODeposits[2].toString()
            );
        }

        var getRebateBalance = await contract.getRebateBalance({
            from: accounts[0],
        });
        console.log("Rebate Balance : ", getRebateBalance.toString(), "acc 0");


        // assert(
        //   parseInt(parseInt(tokensFinal.toString()) / precision) ==
        //     parseInt(expectedUserCeto / precision),
        //   "the excess CETO should have been sent back"
        // );
    });

    it("Buy 10 tickets with cost of each ticket as 1.1ceto , GPP = 9.9ceto - no partner", async() => {
        let amount = "100000000"; // 1 eth.
        let ticketPrice_ = 1100000;
        let partner_ = "0x0000000000000000000000000000000000000000"
        let gpp_ = 9900000;

        const ceto = await tronWeb
            .contract()
            .at("410e0e76ff0f7f9b22b2f9d47624c2f6ac5a4de54e");

        const contract = await BigTent.deployed();
        console.log(contract.address, accounts[0]);

        var tokens = await ceto.myTokens().call({ from: accounts[0] });
        console.log("Initial tokens : ", tokens.toString());

        // disableInitialStage
        var disableInitialStage = await ceto
            .disableInitialStage()
            .send({ from: accounts[0] });
        // console.log(disableInitialStage, "disableInitialStage");
        var onlyAmbassadors = await ceto
            .onlyAmbassadors()
            .call({ from: accounts[0] });
        console.log("Ambassador Phase : ", onlyAmbassadors.toString());

        // Buy
        // var buy_ = await ceto
        //     .buy(accounts[0])
        //     .call({ from: accounts[0], callValue: amount });
        // console.log("Buy : ", buy)
        var tokens = await ceto.myTokens().call({ from: accounts[0] });
        console.log("tokens : ", tokens.toString(), accounts[0]);

        // Approve
        var approve = await ceto
            .approve(contract.address, parseInt(tokens.toString()))
            .send({ from: accounts[0] });

        var allowance = await ceto
            .allowance(accounts[0], contract.address)
            .call({ from: accounts[0] });
        console.log("allowance : ", allowance.toString(), accounts[0]);

        // Start the game
        var startGame = await contract.startGame(
            ticketPrice_,
            partner_,
            gpp_,
            1,
            1618471930, { from: accounts[0] }
        );
        // console.log("startGame : ", startGame);
        console.log("Game started");

        var getEventData = await contract.getEventData({ from: accounts[0] });
        console.log("TIcket Price : ", getEventData[0].toString());
        var partner = await contract.partner.call();
        console.log("partner : ", partner.toString());
        var initialGuaranteedPrizePool = await contract.initialGuaranteedPrizePool.call();
        console.log(
            "initialGuaranteedPrizePool : ",
            initialGuaranteedPrizePool.toString()
        );
        var period = await contract.period.call();
        console.log("period : ", period.toString());
        var startDate = await contract.startDate.call();
        console.log("startDate : ", startDate.toString());
        var gameNumber = await contract.gameNumber.call();
        console.log("gameNumber : ", gameNumber.toString());
        var gameStarted = await contract.gameStarted.call();
        console.log("gameStarted : ", gameStarted.toString());
        var startingTronBalance = await contract.startingTronBalance.call();
        console.log("startingTronBalance : ", startingTronBalance.toString());
        var totalTronBalance = await contract.totalTronBalance({
            from: accounts[0],
        });
        console.log("totalTronBalance : ", totalTronBalance.toString());

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("getCurrentCETOBalance : ", getCurrentCETOBalance.toString());

        // Make multiple buys
        console.log("buying...");
        var buy1 = await contract.buyTicket(3, {
            from: accounts[0],
            feelimit: "4000000",
        });
        // console.log("buy1 : ", buy1);

        var myDividends = await ceto.methods
            .myDividends(true)
            .call({ from: accounts[0] });
        console.log("Initial myDividends : ", myDividends.toString());

        // Check values of the contract
        var participantsCount = await contract.participantsCount.call();
        console.log("participantsCount : ", participantsCount.toString());

        console.log("buying...");
        var buy2 = await contract.buyTicket(7, {
            from: accounts[0],
            feelimit: "4000000",
        });
        // console.log("buy2 : ", buy2);

        var myDividends = await ceto
            .myDividends(true)
            .call({ from: contract.address });
        console.log("Initial myDividends : ", myDividends.toString());
        // Check values of the contract
        var participantsCount = await contract.participantsCount.call();
        console.log("participantsCount : ", participantsCount.toString());

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("getCurrentCETOBalance : ", getCurrentCETOBalance.toString());

        var getCursor = await contract.getCursor({
            from: accounts[0],
        });
        console.log(
            "getCursor : ",
            getCursor[0].toString(),
            getCursor[1].toString()
        );

        for (var i = 0; i < getCursor[1]; i++) {
            var TimestampedCETODeposits = await contract.TimestampedCETODeposits(i, {
                from: accounts[0],
            });
            console.log(
                "TimestampedCETODeposits : ",
                TimestampedCETODeposits[0].toString(),
                TimestampedCETODeposits[1].toString(),
                TimestampedCETODeposits[2].toString()
            );
        }

        var getRebateBalance = await contract.getRebateBalance({
            from: accounts[0],
        });
        console.log("Rebate Balance : ", getRebateBalance.toString());

    });
    it("Withdraw test", async() => {
        const contract = await BigTent.deployed();
        console.log(contract.address);
        const ceto = await tronWeb
            .contract()
            .at("410e0e76ff0f7f9b22b2f9d47624c2f6ac5a4de54e");
        var getEventData = await contract.getEventData({ from: accounts[0] });
        console.log("getEventData : ", getEventData[0].toString());
        var tokens1 = await ceto.myTokens().call({ from: accounts[0] });

        //Generate a 256 bit random number - reveal
        const value = randomBytes.randomBytes(32); // 32 bytes = 256 bits
        const reveal = new BN(value.toString("hex"), 16);
        console.log("reveal : ", reveal.toString());
        //Hash reveal to get commit
        const commit = web3.utils.soliditySha3(reveal);
        console.log("commit : ", commit);

        //Send commit to the contract
        var setCommit = await contract.setCommit(commit, { from: accounts[0] });
        // console.log("Setting Commit : ", setCommit);

        var getCurrentCETOBalance_ = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("Current CETO Balance : ", getCurrentCETOBalance_.toString());
        var tokens1 = await ceto.myTokens().call({ from: accounts[0] });
        console.log("Initial tokens : ", tokens1.toString());

        var getPartnerPoolFunds = await contract.getPartnerPoolFunds({
            from: accounts[0],
        });
        console.log(
            "Partner pool funds to be distributed : ",
            getPartnerPoolFunds.toString()
        );
        // Call the result function with the reveal
        var declareResult = await contract.declareResult(reveal.toString(), {
            from: accounts[0],
            feeLimit: 1e8

        });
        console.log("Calculating results : ", declareResult);
        var getEventData = await contract.getEventData({ from: accounts[0] });
        console.log("resultsDeclared : ", getEventData[7].toString());
        var getWinners = await contract.getWinners({ from: accounts[0] });
        console.log(
            "getWinners : ",
            getWinners[0].toString(),
            getWinners[1].toString(),
            getWinners[2].toString()
        );
        var getPrizes = await contract.getPrizes({ from: accounts[0] });
        console.log(
            "getPrizes : ",
            getPrizes[0].toString(),
            getPrizes[1].toString(),
            getPrizes[2].toString()
        );
        var getWinnersIndex = await contract.getWinnersIndex({ from: accounts[0] });
        console.log(
            "getWinnersIndex : ",
            getWinnersIndex[0].toString(),
            getWinnersIndex[1].toString(),
            getWinnersIndex[2].toString()
        );
        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("Current CETO Balance : ", getCurrentCETOBalance.toString());
        var getGameResult = await contract.getGameResult(1, { from: accounts[0] });
        console.log(
            "getGameResult : ",
            getGameResult[0].toString(),
            getGameResult[1].toString()
        );

        var tokens2 = await ceto.myTokens().call({ from: accounts[0] });
        var prize1 = (parseInt(getCurrentCETOBalance_) * 9) / 13;
        var prize2 = (parseInt(getCurrentCETOBalance_) * 3) / 13;
        var prize3 = (parseInt(getCurrentCETOBalance_) * 1) / 13;
        token_final =
            prize1 -
            prize1 / 10 +
            prize2 -
            prize2 / 10 +
            prize3 -
            prize3 / 10 +
            parseInt(tokens1);
        console.log("token_final : ", token_final);

        console.log("Resetting game");
        var resetGame = await contract.resetGame({
            from: accounts[0],
        });
        // console.log("Reset : ", resetGame);
        console.log("Game ended");

        var myDividends = await ceto
            .myDividends(true)
            .call({ from: contract.address });
        console.log("Initial myDividends : ", myDividends.toString());
        var getCursor = await contract.getCursor({
            from: accounts[0],
        });
        console.log(
            "getCursor : ",
            getCursor[0].toString(),
            getCursor[1].toString()
        );

        for (var i = 0; i < getCursor[1]; i++) {
            var TimestampedCETODeposits = await contract.TimestampedCETODeposits(i, {
                from: accounts[0],
            });
            console.log(
                "TimestampedCETODeposits : ",
                TimestampedCETODeposits[0].toString(),
                TimestampedCETODeposits[1].toString(),
                TimestampedCETODeposits[2].toString()
            );
        }
        var getRebateBalance1 = await contract.getRebateBalance({
            from: accounts[0],
        });
        console.log("Rebate Balance : ", getRebateBalance1.toString(), "acc 0");

        var startingTronBalance = await contract.startingTronBalance.call();
        console.log("startingTronBalance : ", startingTronBalance.toString());
        var totalTronBalance = await contract.totalTronBalance({
            from: accounts[0],
        });
        console.log("totalTronBalance : ", totalTronBalance.toString());

        var getCurrentCETOBalance = await contract.getCurrentCETOBalance({
            from: accounts[0],
        });
        console.log("getCurrentCETOBalance : ", getCurrentCETOBalance.toString());
        var myDividends = await ceto
            .myDividends(true)
            .call({ from: contract.address });
        console.log("Final myDividends : ", myDividends.toString());

        var tokens1 = await ceto.myTokens().call({ from: accounts[0] });
        console.log("Current tokens : ", tokens1.toString());

        var tokens_ = await ceto.calculateTokensReceived(561).call({ from: accounts[0] });
        var Withdraw = await contract.withdrawRebate(
            561, {
                from: accounts[0],
                feeLimit: 1e8
            }
        );
        console.log("Withdraw : ", Withdraw)
        var expected_tokens_gained = Math.round(parseInt(tokens_.toString()) - (parseInt(tokens_.toString()) / 10))
        console.log("Expected tokens gained: ", expected_tokens_gained.toString());


        var tokens = await ceto.myTokens().call({ from: accounts[0] });
        console.log("Current tokens : ", tokens.toString());

        var actual_tokens_gained = parseInt(tokens.toString()) - parseInt(tokens1.toString())
        console.log("Actual tokens gained: ", actual_tokens_gained);

        var getCursor = await contract.getCursor({
            from: accounts[0],
        });
        console.log(
            "getCursor : ",
            getCursor[0].toString(),
            getCursor[1].toString()
        );

        for (var i = 0; i < getCursor[1]; i++) {
            var TimestampedCETODeposits = await contract.TimestampedCETODeposits(i, {
                from: accounts[0],
            });
            console.log(
                "TimestampedCETODeposits : ",
                TimestampedCETODeposits[0].toString(),
                TimestampedCETODeposits[1].toString(),
                TimestampedCETODeposits[2].toString()
            );
        }


        var getRebateBalance = await contract.getRebateBalance({
            from: accounts[0],
        });
        console.log("Rebate Balance : ", getRebateBalance.toString(), "acc 0");

        assert(
            actual_tokens_gained == parseInt(expected_tokens_gained),
            "Rebate tokens miscalculated"
        );
        // assert(parseInt(prize2) == getPrizes[1], "2nd prize miscalculated");
        // assert(parseInt(prize3) == getPrizes[2], "3rd prize miscalculated");
        // assert(
        //   parseInt(token_final / 1e6) ==
        //     parseInt(parseInt(tokens2.toString()) / 1e6),
        //   "Distribution failed"
        // );
    });


})
