// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
/// @title SupplyChain - role-based agricultural supply chain traceability & marketplace
/// @author
/// @notice Single-contract implementation covering Admin, Farmer, Distributor, Retailer, Customer flows.
/// @dev Uses pull-on-failure payment pattern (attempt direct transfer; fallback to pending withdrawals).
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
contract SupplyChain is Ownable, ReentrancyGuard {
   
    // -----------------------
    // Enums & Structs
    // -----------------------
    enum Role { None, Farmer, Distributor, Retailer, Customer, Admin }
    enum Visibility { Private, Public }
    struct UserInfo {
        Role role;
        bool requested;
        string idHash;
        string meta;
        uint256 appliedAt;
        bool exists;
    }
    struct FarmerProduct {
        uint256 batchId;
        address farmer;
        string cropName;
        string cropPeriod;
        uint256 daysToHarvest;
        uint256 quantityKg; // remaining quantity
        uint256 pricePerKg; // price in smallest unit
        string location;
        Visibility visibility;
        string ipfsHash;
        uint256 createdAt;
        bool active;
    }
    struct DistributorBatch {
        uint256 batchId; // id for distributor-owned portion
        uint256 originBatchId; // farmer batch id
        address distributor;
        uint256 quantityKg; // remaining quantity in this distributor batch
        uint256 purchasePricePerKg;
        uint256 listedPricePerKg; // optional
        Visibility visibility;
        uint256 createdAt;
        bool active;
    }
    struct RetailPack {
        uint256 packId;
        uint256 distributorBatchId;
        address distributor;
        uint256 quantityKg;
        uint256 pricePerKg; // price per kg set by distributor for retailers
        Visibility visibility;
        address privateBuyer; // if visibility==Private, this is allowed buyer
        bool available;
        string ipfsHash;
        uint256 createdAt;
    }
    struct RetailUnit {
        uint256 unitId;
        uint256 parentPackId; // original pack id
        address retailer;
        uint256 quantityKg;
        uint256 pricePerKg; // price per kg for customers
        bool available;
        string ipfsHash;
        uint256 createdAt;
    }
    struct BuyRequest {
        uint256 requestId;
        uint256 packId;
        address requester;
        uint256 qtyKg;
        bool wantsRetailer;
        uint256 amountPaid; // msg.value that was sent
        bool resolved;
        bool accepted;
        uint256 createdAt;
    }
    struct PurchaseRecord {
    uint256 purchaseId;
    uint256 unitId;
    uint256 quantityKg;
    uint256 pricePerKg;
    uint256 qtyKg;       // ✅ this line must exist
    address seller;
    address buyer;
    Role sellerRole;   // 👈 new
    Role buyerRole;    // 👈 new
    uint256 timestamp;
    }

    // -----------------------
    // State variables / counters
    // -----------------------
    mapping(address => UserInfo) public users;

    // User tracking arrays
    address[] private allUserAddresses;
    mapping(address => bool) private isUserTracked;

    uint256 private farmerProductCounter;
    uint256 private distributorBatchCounter;
    uint256 private retailPackCounter;
    uint256 private retailUnitCounter;
    uint256 private buyRequestCounter;
    uint256 private purchaseCounter;

    mapping(uint256 => FarmerProduct) public farmerProducts;        // batchId -> FarmerProduct
    mapping(uint256 => DistributorBatch) public distributorBatches; // distributorBatchId -> DistributorBatch
    mapping(uint256 => RetailPack) public retailPacks;              // packId -> RetailPack
    mapping(uint256 => RetailUnit) public retailUnits;              // unitId -> RetailUnit
    mapping(uint256 => BuyRequest) public buyRequests;              // requestId -> BuyRequest
    mapping(uint256 => PurchaseRecord) public purchaseRecords;      // purchaseId -> PurchaseRecord

    // pending withdrawals for pull pattern (if direct transfer fails)
    mapping(address => uint256) public pendingWithdrawals;
    // -----------------------
    // Events
    // -----------------------
    event RoleRequested(address indexed user, uint8 indexed role, uint256 when);
    event RoleApproved(address indexed user, uint8 indexed role, uint256 when);
    event RoleRevoked(address indexed user, uint8 indexed previousRole, uint256 when);
    event ProductAdded(uint256 indexed batchId, address indexed farmer, uint8 visibility, uint256 when);
    event ProductUpdated(uint256 indexed batchId, address indexed farmer, uint256 when);
    event BatchPurchased(uint256 indexed distributorBatchId, uint256 indexed originBatchId, address indexed distributor, uint256 qtyKg, uint256 pricePerKg, uint256 when);
    event PackCreated(uint256 indexed packId, uint256 indexed distributorBatchId, address indexed distributor, uint256 qtyKg, uint256 pricePerKg, uint256 when);
    event PackListed(uint256 indexed packId, uint8 visibility, address privateAddress, uint256 when);
    event BuyRequestCreated(uint256 indexed requestId, uint256 indexed packId, address indexed requester, uint256 qtyKg, bool wantsRetailer, uint256 amountPaid, uint256 when);
    event BuyRequestResolved(uint256 indexed requestId, uint256 indexed packId, address indexed requester, bool accepted, uint256 when);
    event RetailUnitCreated(uint256 indexed unitId, uint256 indexed parentPackId, address indexed retailer, uint256 qtyKg, uint256 pricePerKg, uint256 when);
    event UnitListed(uint256 indexed unitId, uint8 visibility, uint256 when);
    event UnitPurchased(uint256 indexed purchaseId, uint256 indexed unitId, address indexed buyer, address seller, uint256 qtyKg, uint256 pricePerKg, uint256 when);
    event Withdrawn(address indexed user, uint256 amount, uint256 when);
    // -----------------------
    // Constructor
    // -----------------------
    constructor() {
        // Deployer becomes Admin
        users[msg.sender] = UserInfo({
            role: Role.Admin,
            requested: false,
            idHash: "",
            meta: "",
            appliedAt: block.timestamp,
            exists: true
        });
        
        // Track the admin user
        allUserAddresses.push(msg.sender);
        isUserTracked[msg.sender] = true;
    }
    // -----------------------
    // Modifiers
    // -----------------------
    modifier onlyRole(Role r) {
        require(users[msg.sender].role == r, "SupplyChain: caller does not have required role");
        _;
    }
    modifier onlyExistingUser(address account) {
        require(users[account].exists, "SupplyChain: user not registered");
        _;
    }
    // -----------------------
    // Role management
    // -----------------------
    /// @notice Request a role (Farmer or Distributor)
    /// @param role numeric Role (1=Farmer,2=Distributor)
    /// @param idHash hashed KYC or metadata pointer
    /// @param meta optional metadata
    function requestRole(uint8 role, string calldata idHash, string calldata meta) external {
        require(role == uint8(Role.Farmer) || role == uint8(Role.Distributor), "SupplyChain: only Farmer or Distributor can request");
        UserInfo storage u = users[msg.sender];
        require(u.role == Role.None, "SupplyChain: already has a role");
        
        u.requested = true;
        u.idHash = idHash;
        u.meta = meta;
        u.appliedAt = block.timestamp;
        u.exists = true;
        
        // Track the user if not already tracked
        if (!isUserTracked[msg.sender]) {
            allUserAddresses.push(msg.sender);
            isUserTracked[msg.sender] = true;
        }
        
        emit RoleRequested(msg.sender, role, block.timestamp);
    }
    /// @notice Admin approves a requested role (Farmer/Distributor/ Retailer optionally)
    /// @param user address to approve
    /// @param role numeric role to assign
    function approveRole(address user, uint8 role) external onlyOwner {
        require(user != address(0), "SupplyChain: zero address");
        require(users[user].exists, "SupplyChain: user not found");
        require(role <= uint8(Role.Admin), "SupplyChain: invalid role");
        
        users[user].role = Role(role);
        users[user].requested = false;
        users[user].appliedAt = block.timestamp;
        
        // Ensure user is tracked
        if (!isUserTracked[user]) {
            allUserAddresses.push(user);
            isUserTracked[user] = true;
        }
        
        emit RoleApproved(user, role, block.timestamp);
    }
    /// @notice Admin can revoke a role (set to None)
    /// @param user address to revoke
    function revokeRole(address user) external onlyOwner {
        require(users[user].exists, "SupplyChain: user not found");
        uint8 prev = uint8(users[user].role);
        users[user].role = Role.None;
        users[user].requested = false;
        emit RoleRevoked(user, prev, block.timestamp);
    }
    /// @notice Get user info
    function getUserInfo(address user) external view returns (UserInfo memory) {
        return users[user];
    }
    
    // -----------------------
    // Farmer functions
    // -----------------------
    /// @notice Add a product (batch) by Farmer
    function addProduct(
        string calldata cropName,
        string calldata cropPeriod,
        uint256 daysToHarvest,
        uint256 quantityKg,
        uint256 pricePerKg,
        string calldata location,
        uint8 visibility,
        string calldata ipfsHash
    ) external onlyRole(Role.Farmer) {
        require(quantityKg > 0, "SupplyChain: quantity > 0");
        require(pricePerKg > 0, "SupplyChain: price > 0");
        require(visibility <= uint8(Visibility.Public), "SupplyChain: invalid visibility");
        farmerProductCounter++;
        FarmerProduct storage p = farmerProducts[farmerProductCounter];
        p.batchId = farmerProductCounter;
        p.farmer = msg.sender;
        p.cropName = cropName;
        p.cropPeriod = cropPeriod;
        p.daysToHarvest = daysToHarvest;
        p.quantityKg = quantityKg;
        p.pricePerKg = pricePerKg;
        p.location = location;
        p.visibility = Visibility(visibility);
        p.ipfsHash = ipfsHash;
        p.createdAt = block.timestamp;
        p.active = true;
        emit ProductAdded(p.batchId, msg.sender, visibility, block.timestamp);
    }
    /// @notice Farmer may update price/quantity/status or ipfsHash
    function updateProduct(
        uint256 batchId,
        uint256 newQuantityKg,
        uint256 newPricePerKg,
        uint8 newVisibility,
        string calldata newIpfsHash,
        bool setActive
    ) external {
        FarmerProduct storage p = farmerProducts[batchId];
        require(p.batchId != 0, "SupplyChain: product not found");
        require(p.farmer == msg.sender, "SupplyChain: not owner");
        if (newQuantityKg > 0) p.quantityKg = newQuantityKg;
        if (newPricePerKg > 0) p.pricePerKg = newPricePerKg;
        if (newVisibility <= uint8(Visibility.Public)) p.visibility = Visibility(newVisibility);
        if (bytes(newIpfsHash).length > 0) p.ipfsHash = newIpfsHash;
        p.active = setActive;
        emit ProductUpdated(batchId, msg.sender, block.timestamp);
    }
    /// @notice Get farmer products of caller (can be used by farmer dashboard)
    function getMyProducts() external view onlyRole(Role.Farmer) returns (FarmerProduct[] memory) {
        uint256 total = farmerProductCounter;
        uint256 cnt = 0;
        // count how many belong to caller
        for (uint256 i = 1; i <= total; i++) {
            if (farmerProducts[i].batchId != 0 && farmerProducts[i].farmer == msg.sender) cnt++;
        }
        FarmerProduct[] memory out = new FarmerProduct[](cnt);
        uint256 idx = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (farmerProducts[i].batchId != 0 && farmerProducts[i].farmer == msg.sender) {
                out[idx] = farmerProducts[i];
                idx++;
            }
        }
        return out;
    }
    // -----------------------
    // Distributor functions
    // -----------------------
    /// @notice Distributor purchases from a Farmer batch (payable)
    /// @dev Transfers money to farmer (or uses fallback to pendingWithdrawals)
    function buyFarmerBatch(uint256 farmerBatchId, uint256 qtyKg) external payable onlyRole(Role.Distributor) nonReentrant {
        FarmerProduct storage fp = farmerProducts[farmerBatchId];
        require(fp.batchId != 0 && fp.active, "SupplyChain: farmer batch not found or inactive");
        require(fp.visibility == Visibility.Public || fp.farmer == msg.sender, "SupplyChain: not allowed to buy private batch");
        require(qtyKg > 0 && qtyKg <= fp.quantityKg, "SupplyChain: invalid qty");
        uint256 total = qtyKg * fp.pricePerKg;
        require(msg.value == total, "SupplyChain: incorrect payment");
        // Create distributor batch record
        distributorBatchCounter++;
        DistributorBatch storage db = distributorBatches[distributorBatchCounter];
        db.batchId = distributorBatchCounter;
        db.originBatchId = farmerBatchId;
        db.distributor = msg.sender;
        db.quantityKg = qtyKg;
        db.purchasePricePerKg = fp.pricePerKg;
        db.listedPricePerKg = fp.pricePerKg; // default to purchase price
        db.visibility = Visibility.Public;
        db.createdAt = block.timestamp;
        db.active = true;
        // reduce farmer quantity
        fp.quantityKg -= qtyKg;
        if (fp.quantityKg == 0) fp.active = false;
        // forward funds to farmer (checks-effects-interactions)
        (bool sent, ) = fp.farmer.call{value: msg.value}("");
        if (!sent) {
            // fallback to pending withdrawals
            pendingWithdrawals[fp.farmer] += msg.value;
        }
        emit BatchPurchased(db.batchId, farmerBatchId, msg.sender, qtyKg, fp.pricePerKg, block.timestamp);
    }
    /// @notice Distributor splits their distributorBatch into retail packs
    function splitDistributorBatch(
        uint256 distributorBatchId,
        uint256[] calldata splitQuantities,
        uint256[] calldata pricesPerKg,
        string[] calldata ipfsHashes
    ) external onlyRole(Role.Distributor) {
        DistributorBatch storage db = distributorBatches[distributorBatchId];
        require(db.batchId != 0 && db.active, "SupplyChain: distributor batch not found or inactive");
        require(db.distributor == msg.sender, "SupplyChain: not owner of distributor batch");
        require(splitQuantities.length == pricesPerKg.length, "SupplyChain: length mismatch");
        require(splitQuantities.length == ipfsHashes.length, "SupplyChain: ipfs length mismatch");
        uint256 sum = 0;
        for (uint256 i = 0; i < splitQuantities.length; i++) {
            sum += splitQuantities[i];
        }
        require(sum <= db.quantityKg, "SupplyChain: sum exceeds distributor batch qty");
        for (uint256 i = 0; i < splitQuantities.length; i++) {
            retailPackCounter++;
            RetailPack storage rp = retailPacks[retailPackCounter];
            rp.packId = retailPackCounter;
            rp.distributorBatchId = distributorBatchId;
            rp.distributor = msg.sender;
            rp.quantityKg = splitQuantities[i];
            rp.pricePerKg = pricesPerKg[i];
            rp.visibility = Visibility.Private; // default private (distributor chooses)
            rp.privateBuyer = address(0);
            rp.available = true;
            rp.ipfsHash = ipfsHashes[i];
            rp.createdAt = block.timestamp;
            emit PackCreated(rp.packId, distributorBatchId, msg.sender, rp.quantityKg, rp.pricePerKg, block.timestamp);
        }
        db.quantityKg -= sum;
        if (db.quantityKg == 0) db.active = false;
    }
    /// @notice Distributor lists a pack public or private
    function listPack(uint256 packId, uint8 visibility, address optionalPrivateAddress) external onlyRole(Role.Distributor) {
        RetailPack storage p = retailPacks[packId];
        require(p.packId != 0, "SupplyChain: pack not found");
        require(p.distributor == msg.sender, "SupplyChain: not pack owner");
        require(visibility <= uint8(Visibility.Public), "SupplyChain: invalid visibility");
        p.visibility = Visibility(visibility);
        if (p.visibility == Visibility.Private) {
            require(optionalPrivateAddress != address(0), "SupplyChain: private address required");
            p.privateBuyer = optionalPrivateAddress;
        } else {
            p.privateBuyer = address(0);
        }
        emit PackListed(packId, visibility, p.privateBuyer, block.timestamp);
    }
    /// @notice Get distributor inventory (their batches & packs)
    function getDistributorInventory(address distributor) external view returns (DistributorBatch[] memory, RetailPack[] memory) {
        uint256 dbTotal = distributorBatchCounter;
        uint256 packTotal = retailPackCounter;
        uint256 dbCount = 0;
        uint256 packCount = 0;
        for (uint256 i = 1; i <= dbTotal; i++) {
            if (distributorBatches[i].batchId != 0 && distributorBatches[i].distributor == distributor) dbCount++;
        }
        for (uint256 i = 1; i <= packTotal; i++) {
            if (retailPacks[i].packId != 0 && retailPacks[i].distributor == distributor) packCount++;
        }
        DistributorBatch[] memory dbOut = new DistributorBatch[](dbCount);
        RetailPack[] memory rpOut = new RetailPack[](packCount);
        uint256 di = 0;
        for (uint256 i = 1; i <= dbTotal; i++) {
            if (distributorBatches[i].batchId != 0 && distributorBatches[i].distributor == distributor) {
                dbOut[di] = distributorBatches[i];
                di++;
            }
        }
        uint256 pi = 0;
        for (uint256 i = 1; i <= packTotal; i++) {
            if (retailPacks[i].packId != 0 && retailPacks[i].distributor == distributor) {
                rpOut[pi] = retailPacks[i];
                pi++;
            }
        }
        return (dbOut, rpOut);
    }
    // -----------------------
    // Buy request & Retailer assignment flow (Option B)
    // -----------------------
    /// @notice Create a buy request to a pack (anyone can call), msg.value should equal price * qty
    function createBuyRequest(uint256 packId, uint256 qtyKg, bool wantsRetailer) external payable nonReentrant {
        RetailPack storage p = retailPacks[packId];
        require(p.packId != 0, "SupplyChain: pack not found");
        require(p.available, "SupplyChain: pack not available");
        require(qtyKg > 0 && qtyKg <= p.quantityKg, "SupplyChain: invalid qty");
        uint256 total = qtyKg * p.pricePerKg;
        require(msg.value == total, "SupplyChain: incorrect payment");
        buyRequestCounter++;
        BuyRequest storage br = buyRequests[buyRequestCounter];
        br.requestId = buyRequestCounter;
        br.packId = packId;
        br.requester = msg.sender;
        br.qtyKg = qtyKg;
        br.wantsRetailer = wantsRetailer;
        br.amountPaid = msg.value;
        br.resolved = false;
        br.accepted = false;
        br.createdAt = block.timestamp;
        emit BuyRequestCreated(br.requestId, packId, msg.sender, qtyKg, wantsRetailer, msg.value, block.timestamp);
    }
    /// @notice Distributor resolves a buy request (accept/refuse). If accepted: transfer funds to distributor and create retail unit for requester, optionally assign Retailer role.
    function approveBuyRequest(uint256 requestId, bool accept) external onlyRole(Role.Distributor) nonReentrant {
        BuyRequest storage br = buyRequests[requestId];
        require(br.requestId != 0, "SupplyChain: request not found");
        require(!br.resolved, "SupplyChain: already resolved");
        RetailPack storage p = retailPacks[br.packId];
        require(p.packId != 0, "SupplyChain: pack not found");
        require(p.distributor == msg.sender, "SupplyChain: caller not pack owner");
        br.resolved = true;
        br.accepted = accept;
        if (!accept) {
            // refund to requester (try direct transfer, fallback to pendingWithdrawals)
            (bool refunded, ) = br.requester.call{value: br.amountPaid}("");
            if (!refunded) pendingWithdrawals[br.requester] += br.amountPaid;
            emit BuyRequestResolved(br.requestId, br.packId, br.requester, false, block.timestamp);
            return;
        }
        // accept: transfer funds to distributor (try direct)
        (bool sent, ) = msg.sender.call{value: br.amountPaid}("");
        if (!sent) {
            pendingWithdrawals[msg.sender] += br.amountPaid;
        }
        // reduce pack quantity
        require(br.qtyKg <= p.quantityKg, "SupplyChain: pack doesn't have that much quantity");
        p.quantityKg -= br.qtyKg;
        if (p.quantityKg == 0) p.available = false;
        // create retail unit owned by the requester
        retailUnitCounter++;
        RetailUnit storage ru = retailUnits[retailUnitCounter];
        ru.unitId = retailUnitCounter;
        ru.parentPackId = br.packId;
        ru.retailer = br.requester;
        ru.quantityKg = br.qtyKg;
        ru.pricePerKg = p.pricePerKg; // by default same as pack price; retailer can re-sell with different price using splitRetailPack
        ru.available = true;
        ru.ipfsHash = "";
        ru.createdAt = block.timestamp;
        // assign global Retailer role if requested and not already a retailer
        if (br.wantsRetailer && users[br.requester].role != Role.Retailer) {
            users[br.requester].role = Role.Retailer;
            users[br.requester].exists = true;
        }
        emit BuyRequestResolved(br.requestId, br.packId, br.requester, true, block.timestamp);
        emit RetailUnitCreated(ru.unitId, br.packId, br.requester, ru.quantityKg, ru.pricePerKg, block.timestamp);
    }
    /// @notice Distributor can view pending buy requests addressed to their packs
    function getPendingRequestsForDistributor(address distributor) external view returns (BuyRequest[] memory) {
        uint256 total = buyRequestCounter;
        uint256 cnt = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (!buyRequests[i].resolved) {
                // check whether pack belongs to distributor
                RetailPack storage p = retailPacks[buyRequests[i].packId];
                if (p.distributor == distributor) cnt++;
            }
        }
        BuyRequest[] memory out = new BuyRequest[](cnt);
        uint256 idx = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (!buyRequests[i].resolved) {
                RetailPack storage p = retailPacks[buyRequests[i].packId];
                if (p.distributor == distributor) {
                    out[idx] = buyRequests[i];
                    idx++;
                }
            }
        }
        return out;
    }
    // -----------------------
    // Retailer functions
    // -----------------------
    /// @notice Retailer splits an owned unit into smaller customer units with prices
    /// @param unitId the retailer-owned unit id
    /// @param unitQuantities array of quantities to split into
    /// @param unitPricesPerKg corresponding prices per kg the retailer wants for customers
    /// @param ipfsHashes optional per-new-unit ipfsHashes
    function splitRetailUnit(
        uint256 unitId,
        uint256[] calldata unitQuantities,
        uint256[] calldata unitPricesPerKg,
        string[] calldata ipfsHashes
    ) external onlyRole(Role.Retailer) {
        RetailUnit storage root = retailUnits[unitId];
        require(root.unitId != 0, "SupplyChain: unit not found");
        require(root.retailer == msg.sender, "SupplyChain: not owner");
        require(unitQuantities.length == unitPricesPerKg.length, "SupplyChain: length mismatch");
        require(unitQuantities.length == ipfsHashes.length, "SupplyChain: ipfs length mismatch");
        uint256 sum = 0;
        for (uint256 i = 0; i < unitQuantities.length; i++) sum += unitQuantities[i];
        require(sum <= root.quantityKg, "SupplyChain: sum exceeds qty");
        for (uint256 i = 0; i < unitQuantities.length; i++) {
            retailUnitCounter++;
            RetailUnit storage nu = retailUnits[retailUnitCounter];
            nu.unitId = retailUnitCounter;
            nu.parentPackId = root.parentPackId;
            nu.retailer = msg.sender;
            nu.quantityKg = unitQuantities[i];
            nu.pricePerKg = unitPricesPerKg[i];
            nu.available = true;
            nu.ipfsHash = ipfsHashes[i];
            nu.createdAt = block.timestamp;
            emit RetailUnitCreated(nu.unitId, root.parentPackId, msg.sender, nu.quantityKg, nu.pricePerKg, block.timestamp);
        }
        root.quantityKg -= sum;
        if (root.quantityKg == 0) root.available = false;
    }
    /// @notice Retailer lists a unit for customers (visibility is simplified; front-end will filter by available)
    function listUnitForCustomers(uint256 unitId, uint8 /*visibility*/) external onlyRole(Role.Retailer) {
        RetailUnit storage u = retailUnits[unitId];
        require(u.unitId != 0, "SupplyChain: unit not found");
        require(u.retailer == msg.sender, "SupplyChain: not owner");
        u.available = true;
        emit UnitListed(unitId, 1, block.timestamp);
    }
    /// @notice Get retailer inventory (units)
    function getRetailerInventory(address retailer) external view returns (RetailUnit[] memory) {
        uint256 total = retailUnitCounter;
        uint256 cnt = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (retailUnits[i].unitId != 0 && retailUnits[i].retailer == retailer) cnt++;
        }
        RetailUnit[] memory out = new RetailUnit[](cnt);
        uint256 idx = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (retailUnits[i].unitId != 0 && retailUnits[i].retailer == retailer) {
                out[idx] = retailUnits[i];
                idx++;
            }
        }
        return out;
    }
    // -----------------------
    // Customer purchase
    // -----------------------
    /// @notice Buy a retail unit (payable)
    function buyRetailUnit(uint256 unitId, uint256 qtyKg) external payable nonReentrant {
    RetailUnit storage u = retailUnits[unitId];
    require(u.unitId != 0 && u.available, "SupplyChain: unit not available");
    require(qtyKg > 0 && qtyKg <= u.quantityKg, "SupplyChain: invalid qty");

    uint256 total = qtyKg * u.pricePerKg;
    require(msg.value == total, "SupplyChain: incorrect payment");

    purchaseCounter++;
    PurchaseRecord storage pr = purchaseRecords[purchaseCounter];

    pr.purchaseId = purchaseCounter;
    pr.unitId = unitId;
    pr.qtyKg = qtyKg;
    pr.pricePerKg = u.pricePerKg;
    pr.seller = u.retailer;
    pr.buyer = msg.sender;
    pr.sellerRole = users[u.retailer].role;  // 👈 added
    pr.buyerRole = users[msg.sender].role;   // 👈 added
    pr.timestamp = block.timestamp;

    // transfer funds to seller (retailer)
    (bool sent, ) = u.retailer.call{value: msg.value}("");
    if (!sent) {
        pendingWithdrawals[u.retailer] += msg.value;
    }

    // reduce quantity
    u.quantityKg -= qtyKg;
    if (u.quantityKg == 0) {
        u.available = false;
    }

    emit UnitPurchased(
        pr.purchaseId,
        unitId,
        msg.sender,
        u.retailer,
        qtyKg,
        u.pricePerKg,
        block.timestamp
    );
}

    /// @notice Get purchase history for a user (buyer or seller)
    function getPurchaseHistory(address user) external view returns (PurchaseRecord[] memory) {
        uint256 total = purchaseCounter;
        uint256 cnt = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (purchaseRecords[i].buyer == user || purchaseRecords[i].seller == user) cnt++;
        }
        PurchaseRecord[] memory out = new PurchaseRecord[](cnt);
        uint256 idx = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (purchaseRecords[i].buyer == user || purchaseRecords[i].seller == user) {
                out[idx] = purchaseRecords[i];
                idx++;
            }
        }
        return out;
    }
    // -----------------------
    // Traceability getters
    // -----------------------
    /// @notice Return full trace for a retail unit: (farmerProduct, distributorBatch, retailPack, retailUnit)
    function getUnitTrace(uint256 unitId) external view returns (
        FarmerProduct memory farmer,
        DistributorBatch memory distributor,
        RetailPack memory pack,
        RetailUnit memory unit
    ) {
        RetailUnit memory u = retailUnits[unitId];
        require(u.unitId != 0, "SupplyChain: unit not found");
        RetailPack memory p = retailPacks[u.parentPackId];
        DistributorBatch memory db = distributorBatches[p.distributorBatchId];
        FarmerProduct memory f = farmerProducts[db.originBatchId];
        return (f, db, p, u);
    }
    /// @notice Get origin farmer batch id for a pack
    function getPackOrigin(uint256 packId) external view returns (uint256 originFarmerBatchId) {
        RetailPack memory p = retailPacks[packId];
        require(p.packId != 0, "SupplyChain: pack not found");
        DistributorBatch memory db = distributorBatches[p.distributorBatchId];
        return db.originBatchId;
    }
    /// @notice Get batch trace: farmerProduct, all distributor batches from that origin, and all packs under those distributor batches
    function getBatchTrace(uint256 farmerBatchId) external view returns (
        FarmerProduct memory farmer,
        DistributorBatch[] memory distributorBatchesOut,
        RetailPack[] memory retailPacksOut
    ) {
        FarmerProduct memory f = farmerProducts[farmerBatchId];
        require(f.batchId != 0, "SupplyChain: farmer batch not found");
        // collect distributor batches with originBatchId == farmerBatchId
        uint256 dbTotal = distributorBatchCounter;
        uint256 dbCount = 0;
        for (uint256 i = 1; i <= dbTotal; i++) {
            if (distributorBatches[i].batchId != 0 && distributorBatches[i].originBatchId == farmerBatchId) dbCount++;
        }
        DistributorBatch[] memory dbOut = new DistributorBatch[](dbCount);
        uint256 di = 0;
        for (uint256 i = 1; i <= dbTotal; i++) {
            if (distributorBatches[i].batchId != 0 && distributorBatches[i].originBatchId == farmerBatchId) {
                dbOut[di] = distributorBatches[i];
                di++;
            }
        }
        // collect packs that belong to those distributor batches
        uint256 packTotal = retailPackCounter;
        uint256 packCount = 0;
        for (uint256 i = 1; i <= packTotal; i++) {
            RetailPack memory p = retailPacks[i];
            if (p.packId != 0) {
                DistributorBatch memory db = distributorBatches[p.distributorBatchId];
                if (db.originBatchId == farmerBatchId) packCount++;
            }
        }
        RetailPack[] memory rpOut = new RetailPack[](packCount);
        uint256 pi = 0;
        for (uint256 i = 1; i <= packTotal; i++) {
            RetailPack memory p = retailPacks[i];
            if (p.packId != 0) {
                DistributorBatch memory db = distributorBatches[p.distributorBatchId];
                if (db.originBatchId == farmerBatchId) {
                    rpOut[pi] = p;
                    pi++;
                }
            }
        }
        return (f, dbOut, rpOut);
    }
    // -----------------------
    // Withdraw pattern
    // -----------------------
    /// @notice Withdraw pending funds (if direct transfer failed earlier)
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "SupplyChain: nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "SupplyChain: withdraw failed");
        emit Withdrawn(msg.sender, amount, block.timestamp);
    }
    // -----------------------
    // Helpers / View counts
    // -----------------------
    function totalFarmerProducts() external view returns (uint256) {
        return farmerProductCounter;
    }
    function totalDistributorBatches() external view returns (uint256) {
        return distributorBatchCounter;
    }
    function totalRetailPacks() external view returns (uint256) {
        return retailPackCounter;
    }
    function totalRetailUnits() external view returns (uint256) {
        return retailUnitCounter;
    }
    function totalBuyRequests() external view returns (uint256) {
        return buyRequestCounter;
    }
    function totalPurchases() external view returns (uint256) {
        return purchaseCounter;
    }
    // -----------------------
    // User management functions
    // -----------------------

    /// @notice Get all registered users with their information
    function getAllUsers() external view returns (address[] memory, UserInfo[] memory) {
        uint256 length = allUserAddresses.length;
        UserInfo[] memory userInfos = new UserInfo[](length);
        
        for (uint256 i = 0; i < length; i++) {
            userInfos[i] = users[allUserAddresses[i]];
        }
        
        return (allUserAddresses, userInfos);
    }

    /// @notice Get only users who requested roles (pending approval)
    function getPendingUsers() external view returns (address[] memory, UserInfo[] memory) {
        uint256 pendingCount = 0;
        
        // First count pending users
        for (uint256 i = 0; i < allUserAddresses.length; i++) {
            if (users[allUserAddresses[i]].requested && users[allUserAddresses[i]].role == Role.None) {
                pendingCount++;
            }
        }
        
        // Create arrays
        address[] memory pendingAddresses = new address[](pendingCount);
        UserInfo[] memory pendingInfos = new UserInfo[](pendingCount);
        uint256 index = 0;
        
        // Fill arrays
        for (uint256 i = 0; i < allUserAddresses.length; i++) {
            address userAddr = allUserAddresses[i];
            if (users[userAddr].requested && users[userAddr].role == Role.None) {
                pendingAddresses[index] = userAddr;
                pendingInfos[index] = users[userAddr];
                index++;
            }
        }
        
        return (pendingAddresses, pendingInfos);
    }

    /// @notice Get user count
    function getUserCount() external view returns (uint256) {
        return allUserAddresses.length;
    }

    /// @notice Get users by role
    function getUsersByRole(uint8 role) external view returns (address[] memory) {
        require(role <= uint8(Role.Admin), "SupplyChain: invalid role");
        
        uint256 count = 0;
        // Count users with this role
        for (uint256 i = 0; i < allUserAddresses.length; i++) {
            if (uint8(users[allUserAddresses[i]].role) == role) {
                count++;
            }
        }
        
        address[] memory result = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allUserAddresses.length; i++) {
            if (uint8(users[allUserAddresses[i]].role) == role) {
                result[index] = allUserAddresses[i];
                index++;
            }
        }
        
        return result;
    }
    // -----------------------
    // Fallback / receive
    // -----------------------
    receive() external payable {
        // allow direct funds (could be used for testing or manual top-ups)
        pendingWithdrawals[msg.sender] += msg.value;
    }
}
