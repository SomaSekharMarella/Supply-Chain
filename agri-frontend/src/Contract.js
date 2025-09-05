export const CONTRACT_ADDRESS = "0x24c976A62D08F294F3104c8A82250D3c590cCf48";  

export const CONTRACT_ABI = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "lotId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "farmer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "crop",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "quantity",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "basePrice",
          "type": "uint256"
        }
      ],
      "name": "LotCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "lotId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newPrice",
          "type": "uint256"
        }
      ],
      "name": "LotTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "lotId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "passed",
          "type": "bool"
        }
      ],
      "name": "QualityUpdated",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_crop",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "_quantity",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_basePrice",
          "type": "uint256"
        }
      ],
      "name": "createLot",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_lotId",
          "type": "uint256"
        }
      ],
      "name": "getLot",
      "outputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "farmer",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "crop",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "quantity",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "basePrice",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "currentPrice",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "qualityChecked",
              "type": "bool"
            },
            {
              "internalType": "bool",
              "name": "qualityPassed",
              "type": "bool"
            }
          ],
          "internalType": "struct AgriLot.Lot",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "lots",
      "outputs": [
        {
          "internalType": "address",
          "name": "farmer",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "crop",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "quantity",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "basePrice",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "currentPrice",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "qualityChecked",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "qualityPassed",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextLotId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_lotId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_newPrice",
          "type": "uint256"
        }
      ],
      "name": "transferLot",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_lotId",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "_passed",
          "type": "bool"
        }
      ],
      "name": "updateQuality",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];
