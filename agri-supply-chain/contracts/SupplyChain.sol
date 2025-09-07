// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title SupplyChainRoles - Role request/approval + farmer/distributor product flows
/// @notice Admin = deployer. No private keys are stored. Only public metadata and addresses saved.
contract SupplyChainRoles {
    address public admin;

    enum Role { None, Farmer, Distributor, Admin }

    struct UserInfo {
        Role role;        // assigned role
        bool requested;   // whether currently requested
        string id;        // user provided id (eg. govt id or hash)
        string ip;        // optional metadata
        uint appliedAt;   // timestamp of request
        bool exists;
    }

    mapping(address => UserInfo) public users;

    // Track pending applicant addresses arrays
    address[] public pendingFarmers;
    address[] public pendingDistributors;

    // Approved counts
    uint public farmerCount;
    uint public distributorCount;

    // Product structure for farmers
    struct Product {
        uint id;
        string name;
        string cropMonth;
        uint daysToFinish;
        uint price;
        address farmerAddr;
        uint addedAt;
    }

    // Distribution structure for distributors
    struct Distribution {
        uint id;
        string fromPlace;
        string toPlace;
        uint price;
        address distributorAddr;
        uint addedAt;
    }

    uint public productCount;
    uint public distributionCount;

    mapping(uint => Product) public products;
    mapping(uint => Distribution) public distributions;

    // Events
    event RoleRequested(address indexed user, Role role, string id, string ip);
    event RoleApproved(address indexed user, Role role);
    event ProductAdded(uint indexed productId, address indexed farmer);
    event DistributionAdded(uint indexed distributionId, address indexed distributor);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyRole(Role r) {
        require(users[msg.sender].role == r, "Not authorized role");
        _;
    }

    constructor() {
        admin = msg.sender;
        users[admin] = UserInfo({
            role: Role.Admin,
            requested: false,
            id: "",
            ip: "",
            appliedAt: block.timestamp,
            exists: true
        });
    }

    /// @notice Request a role (Farmer or Distributor). Provide optional id and ip strings.
    function requestRole(Role role, string calldata id, string calldata ip) external {
        require(role == Role.Farmer || role == Role.Distributor, "Invalid requestable role");
        require(users[msg.sender].role == Role.None, "Already has a role");
        require(!users[msg.sender].requested, "Already requested");

        users[msg.sender] = UserInfo({
            role: Role.None,
            requested: true,
            id: id,
            ip: ip,
            appliedAt: block.timestamp,
            exists: true
        });

        if (role == Role.Farmer) {
            pendingFarmers.push(msg.sender);
        } else {
            pendingDistributors.push(msg.sender);
        }

        emit RoleRequested(msg.sender, role, id, ip);
    }

    /// @notice Admin can approve a pending request.
    function approveRole(address userAddr, Role intendedRole) external onlyAdmin {
        require(users[userAddr].requested, "No pending request from user");
        require(intendedRole == Role.Farmer || intendedRole == Role.Distributor, "Invalid role");

        users[userAddr].role = intendedRole;
        users[userAddr].requested = false;

        if (intendedRole == Role.Farmer) {
            farmerCount++;
            _removePending(pendingFarmers, userAddr);
        } else {
            distributorCount++;
            _removePending(pendingDistributors, userAddr);
        }

        emit RoleApproved(userAddr, intendedRole);
    }

    /// @notice Internal helper to remove address from pending array
    function _removePending(address[] storage arr, address addr) internal {
        for (uint i = 0; i < arr.length; i++) {
            if (arr[i] == addr) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
                return;
            }
        }
    }

    /// @notice Get pending farmers
    function getPendingFarmers() external view returns (address[] memory) {
        return pendingFarmers;
    }

    /// @notice Get pending distributors
    function getPendingDistributors() external view returns (address[] memory) {
        return pendingDistributors;
    }

    /* ========== Farmer actions ========== */

    function addProduct(
        string calldata name,
        string calldata cropMonth,
        uint daysToFinish,
        uint price
    ) external onlyRole(Role.Farmer) {
        productCount++;
        products[productCount] = Product({
            id: productCount,
            name: name,
            cropMonth: cropMonth,
            daysToFinish: daysToFinish,
            price: price,
            farmerAddr: msg.sender,
            addedAt: block.timestamp
        });
        emit ProductAdded(productCount, msg.sender);
    }

    /* ========== Distributor actions ========== */

    function addDistribution(
        string calldata fromPlace,
        string calldata toPlace,
        uint price
    ) external onlyRole(Role.Distributor) {
        distributionCount++;
        distributions[distributionCount] = Distribution({
            id: distributionCount,
            fromPlace: fromPlace,
            toPlace: toPlace,
            price: price,
            distributorAddr: msg.sender,
            addedAt: block.timestamp
        });
        emit DistributionAdded(distributionCount, msg.sender);
    }

    /* ========== Read helpers ========== */

    function getUserInfo(address userAddr) external view returns (UserInfo memory) {
        return users[userAddr];
    }

    function getProduct(uint productId) external view returns (Product memory) {
        return products[productId];
    }

    function getDistribution(uint distId) external view returns (Distribution memory) {
        return distributions[distId];
    }
}