// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentWallet {
    address public owner;
    address public agent;

    uint256 public dailyLimit;
    bool public paused;

    mapping(address => bool) public whitelistedRecipients;
    address[] private _whitelistedList;

    struct SpendRecord {
        address to;
        uint256 amount;
        string reason;
        uint256 timestamp;
    }

    SpendRecord[] public history;

    uint256 private _dayStart;
    uint256 private _spentToday;

    event Deposited(address indexed from, uint256 amount);
    event Spent(address indexed to, uint256 amount, string reason);
    event PolicyUpdated(string field);
    event Paused();
    event Unpaused();

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == agent, "Only agent");
        _;
    }

    constructor(address _owner, address _agent) {
        owner = _owner;
        agent = _agent;
        dailyLimit = 0;
        paused = false;
        _dayStart = _todayStart();
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    function deposit() external payable {
        require(msg.value > 0, "Must send ETH");
        emit Deposited(msg.sender, msg.value);
    }

    function spend(address to, uint256 amount, string calldata reason) external onlyAgent {
        require(!paused, "Wallet is paused");
        require(amount > 0, "Amount must be > 0");
        require(address(this).balance >= amount, "Insufficient balance");

        if (_whitelistedList.length > 0) {
            require(whitelistedRecipients[to], "Recipient not whitelisted");
        }

        _resetDailyIfNeeded();
        require(_spentToday + amount <= dailyLimit, "Exceeds daily limit");

        _spentToday += amount;
        history.push(SpendRecord(to, amount, reason, block.timestamp));

        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");

        emit Spent(to, amount, reason);
    }

    function setDailyLimit(uint256 limit) external onlyOwner {
        dailyLimit = limit;
        emit PolicyUpdated("dailyLimit");
    }

    function setRecipientWhitelist(address[] calldata recipients, bool allowed) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            whitelistedRecipients[recipients[i]] = allowed;
            if (allowed) {
                _whitelistedList.push(recipients[i]);
            }
        }
        emit PolicyUpdated("whitelist");
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused();
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused();
    }

    function getSpentToday() external view returns (uint256) {
        if (_todayStart() > _dayStart) {
            return 0;
        }
        return _spentToday;
    }

    function getPolicy() external view returns (
        uint256 _dailyLimit,
        address[] memory _whitelisted,
        bool _paused
    ) {
        return (dailyLimit, _whitelistedList, paused);
    }

    function getHistory(uint256 offset, uint256 limit) external view returns (
        SpendRecord[] memory records
    ) {
        if (offset >= history.length) {
            return new SpendRecord[](0);
        }
        uint256 end = offset + limit;
        if (end > history.length) {
            end = history.length;
        }
        records = new SpendRecord[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            records[i - offset] = history[i];
        }
    }

    function _todayStart() private view returns (uint256) {
        return (block.timestamp / 86400) * 86400;
    }

    function _resetDailyIfNeeded() private {
        uint256 today = _todayStart();
        if (today > _dayStart) {
            _dayStart = today;
            _spentToday = 0;
        }
    }
}
