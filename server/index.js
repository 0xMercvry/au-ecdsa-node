const express = require("express");
const app = express();
const cors = require("cors");
const { keccak256 } = require('ethereum-cryptography/keccak');
const { utf8ToBytes } = require('ethereum-cryptography/utils');
const { sign, recoverPublicKey } = require('ethereum-cryptography/secp256k1');
const port = 3042;

app.use(cors());
app.use(express.json());

const wallets = [
  {
    privateKey: '11e44159a41ec9f208e084379e763fb1c3c889f617b3d5ff481e46ac6f0308da',
    publicKey: '0x46f1074fdd6d81a4792d',
    balance: 100
  },
  {
    privateKey: '42ddb45bcf40ec11ae3b9c8b5bbf93768f099e2ee341783e4468368023e93124',
    publicKey: '0xf08a5a3208d0f31ba71e',
    balance: 50
  },
  {
    privateKey: '2af989db1de25988b1aba8a3be2512a78cfb73e7b4aaef9237a52738ce19bc49',
    publicKey: '0x016975d7079e08a08f4f',
    balance: 25
  },
  {
    privateKey: 'cf88b28b3a1d9785974fb1d5e7a63f7473c5817399ee17ec8995e51c550ffc4e',
    publicKey: '0x6281ca944ead59f3b37e',
    balance: 70
  },
  {
    privateKey: '770f2bf3877e8d3bb75cd7d0d407e1e333d893a41f94080616c153ffb32f3ee6',
    publicKey: '0xf6e1a0de29ac9fbbb8aa',
    balance: 0
  },
]

function hashMessage (message) {
  return keccak256(utf8ToBytes(message))
}

async function signMessage (message, privateKey) {
  const hash = hashMessage(message)
  return await sign(hash, privateKey, { recovered: true })
}

function getBalanceFromAddress (address) {
  for (let x = 0; x < wallets.length; x++) {
    if (wallets[x].publicKey === address) {
      return wallets[x].balance
    }
  }
}
 

app.get('/wallets', (req, res) => {
  return res.send(wallets)
})

app.get('/balances', (req, res) => {
  return res.send(balances)
})


app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

app.post("/send", async (req, res) => {
  const { sender, recipient, amount, signature, recoveryBit } = req.body;

  console.log(signature)

  const recovered = await recoverPublicKey(hashMessage(`${recipient}${amount}`), signature, recoveryBit)

  console.log(`Got recovered publicKey: ${recovered}`);

  if (getBalanceFromAddress(recovered) >= amount) {

  }

  // if (balances[sender] < amount) {
  //   res.status(400).send({ message: "Not enough funds!" });
  // } else {
  //   balances[sender] -= amount;
  //   balances[recipient] += amount;
  //   res.send({ balance: balances[sender] });
  // }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});

function setInitialBalance(address) {
  if (!balances[address]) {
    balances[address] = 0;
  }
}
