// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IUniversalVerifier {
    struct ProofStatus {
        bool isVerified;
        string validatorVersion;
        uint256 blockNumber;
        uint256 blockTimestamp;
    }
    function getProofStatus(
        address sender,
        uint64 requestId
    ) external view returns (ProofStatus memory);
}

contract ZKAirdrop is ERC20, Ownable {
    uint64 public constant HUMANITY_REQUEST_ID = 1;

    IUniversalVerifier public verifier;
    uint256 public airdropAmount;
    uint256 public airdropEndTime;
    uint256 public totalClaimed;
    uint256 public maxClaimable;

    mapping(address => bool) public hasClaimed;

    event AirdropClaimed(address indexed user, uint256 amount);
    event AirdropConfigured(uint256 amount, uint256 endTime, uint256 maxClaimable);

    error AlreadyClaimed();
    error NotVerified();
    error AirdropEnded();
    error AirdropNotActive();
    error MaxClaimsReached();

    constructor(
        address _verifier,
        string memory _name,
        string memory _symbol,
        uint256 _airdropAmount,
        uint256 _airdropDuration,
        uint256 _maxClaimable
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        verifier = IUniversalVerifier(_verifier);
        airdropAmount = _airdropAmount;
        airdropEndTime = block.timestamp + _airdropDuration;
        maxClaimable = _maxClaimable;
        _mint(address(this), _maxClaimable * _airdropAmount);
    }

    function claim() external {
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();
        if (block.timestamp > airdropEndTime) revert AirdropEnded();
        if (totalClaimed >= maxClaimable) revert MaxClaimsReached();

        IUniversalVerifier.ProofStatus memory status = verifier.getProofStatus(
            msg.sender,
            HUMANITY_REQUEST_ID
        );
        if (!status.isVerified) revert NotVerified();

        hasClaimed[msg.sender] = true;
        totalClaimed++;

        _transfer(address(this), msg.sender, airdropAmount);

        emit AirdropClaimed(msg.sender, airdropAmount);
    }

    function isEligible(address _user) external view returns (bool verified, bool claimed, bool active) {
        IUniversalVerifier.ProofStatus memory status = verifier.getProofStatus(
            _user,
            HUMANITY_REQUEST_ID
        );
        verified = status.isVerified;
        claimed = hasClaimed[_user];
        active = block.timestamp <= airdropEndTime && totalClaimed < maxClaimable;
    }

    function remainingTokens() external view returns (uint256) {
        return balanceOf(address(this));
    }

    function recoverUnclaimed() external onlyOwner {
        require(block.timestamp > airdropEndTime, "Airdrop still active");
        uint256 remaining = balanceOf(address(this));
        if (remaining > 0) {
            _transfer(address(this), owner(), remaining);
        }
    }

    function updateAirdropConfig(
        uint256 _newAmount,
        uint256 _newEndTime,
        uint256 _newMaxClaimable
    ) external onlyOwner {
        airdropAmount = _newAmount;
        airdropEndTime = _newEndTime;
        maxClaimable = _newMaxClaimable;
        emit AirdropConfigured(_newAmount, _newEndTime, _newMaxClaimable);
    }
}
