// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AgriLot {

    struct Lot {
        address farmer;
        string crop;
        uint256 quantity;
        uint256 basePrice;
        uint256 currentPrice;
        bool qualityChecked;
        bool qualityPassed;
    }

    mapping(uint256 => Lot) public lots;
    uint256 public nextLotId;

    event LotCreated(uint256 indexed lotId, address indexed farmer, string crop, uint256 quantity, uint256 basePrice);
    event LotTransferred(uint256 indexed lotId, uint256 newPrice);
    event QualityUpdated(uint256 indexed lotId, bool passed);

    function createLot(string memory _crop, uint256 _quantity, uint256 _basePrice) external {
        lots[nextLotId] = Lot({
            farmer: msg.sender,
            crop: _crop,
            quantity: _quantity,
            basePrice: _basePrice,
            currentPrice: _basePrice,
            qualityChecked: false,
            qualityPassed: false
        });

        emit LotCreated(nextLotId, msg.sender, _crop, _quantity, _basePrice);
        nextLotId++;
    }

    function transferLot(uint256 _lotId, uint256 _newPrice) external {
        require(_lotId < nextLotId, "Lot does not exist");
        Lot storage lot = lots[_lotId];
        lot.currentPrice = _newPrice;
        emit LotTransferred(_lotId, _newPrice);
    }

    function updateQuality(uint256 _lotId, bool _passed) external {
        require(_lotId < nextLotId, "Lot does not exist");
        Lot storage lot = lots[_lotId];
        lot.qualityChecked = true;
        lot.qualityPassed = _passed;
        emit QualityUpdated(_lotId, _passed);
    }

    function getLot(uint256 _lotId) external view returns (Lot memory) {
        require(_lotId < nextLotId, "Lot does not exist");
        return lots[_lotId];
    }
}