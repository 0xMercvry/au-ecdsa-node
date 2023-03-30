import Wallet from "./Wallet";
import Transfer from "./Transfer";
import "./App.css";
import { useEffect, useState } from "react";
import server from "./server";
import { keccak256 } from 'ethereum-cryptography/keccak'
import { utf8ToBytes, toHex } from 'ethereum-cryptography/utils'
import {sign} from 'ethereum-cryptography/secp256k1'

function hashMessage (message) {
  return keccak256(utf8ToBytes(message))
}

async function signMessage (message, privateKey) {
  const hash = hashMessage(message)
  return await sign(hash, privateKey, { recovered: true })
}
 
function Select ({ options, id, value, onChange, label, inactive }) {
  return (
    <>
      <label htmlFor={id} className="text-sm font-semibold text-white">{ label }</label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="bg-slate-900 border border-slate-500 text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 mb-2"
      >
        <option></option>
        { options && options.map((val, key) => {
            if (val.privateKey !== inactive) {
              return <option value={val.privateKey} key={key}>{ val.publicKey } ({ val.balance })</option>
            }
          })
        }
      </select>
    </>
  )
}

function Input ({ id, value, type, onChange, max }) {
  return (
    <input
      type={type}
      id={id}
      value={value}
      onChange={onChange}
      min={0}
      max={max}
      className="bg-slate-900 border border-slate-500 text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 my-2"
    />
  )
}

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [balance, setBalance] = useState(0);
  const [address, setAddress] = useState("");

  const [sender, setSender] = useState()
  const [recipient, setRecipient] = useState()
  const [amount, setAmount] = useState(0)


  const [wallets, setWallets] = useState([])

  const loadWallets = async () => {
    const { data } = await server.get('/wallets');
    setWallets(data)
    setIsLoading(false)
  }

  const handleAmount = (e) => {
    const amount = e?.target?.value
    const senderBalance = _getPublicInfoFromAddress(sender)?.balance
    if (sender && amount > senderBalance) {
      console.error(`Amount requested is too high.`)
      return false
    }
    setAmount(parseInt(amount))
  }

  const submit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    const recipientPublicKey = _getPublicInfoFromAddress(recipient)?.address

    const [signature, recoveryBit] = await signMessage(`${recipientPublicKey}${amount}`, sender)

    console.log(`recipient: ${recipientPublicKey}. amount: ${amount}. signature: ${signature}`)

    const { data } = await server.post('/send', {
      recipient: recipientPublicKey,
      amount,
      signature,
      recoveryBit
    })
    console.log(data)
  }

  const _getPublicInfoFromAddress = (addr) => {
    for (let x = 0; x < wallets.length; x++) {
      if (addr === wallets[x].privateKey) {
        return { address: wallets[x].publicKey, balance: wallets[x].balance }
      }
    }
  }

  useEffect(() => {
    loadWallets()
  }, [])

  if (isLoading) return <></>

  const senderInfo = _getPublicInfoFromAddress(sender)
  const recipientInfo = _getPublicInfoFromAddress(recipient)

  return (
    <div className="bg-slate-950 flex">
      <div className="w-1/4 bg-slate-700 md:w-1/2 h-auto mx-auto my-10 rounded-xl py-7 px-8">
        <h1 className="text-lg font-semibold text-white mb-6">Transfering AU funds</h1>

        <Select
          id="sender"
          options={wallets}
          onChange={e => {
            setSender(e?.target?.value)
            console.log(`set sender privateKey: (${e?.target?.value})`)
          }}
          inactive={recipient}
          label="Select a sender"
        />

        <Select
          id="recipient"
          options={wallets}
          onChange={e => setRecipient(e?.target?.value)}
          inactive={sender}
          label="Select a recipient"
        />

        <div className="my-6">
          <label className="text-sm font-semibold text-white">How much would you send?</label>
          <Input id="amount" type="number" max={100} onChange={handleAmount} />
        </div>


        { (sender && recipient && amount > 0) &&
          (
            <>
              <hr className="border-slate-500 mt-5" />
              <div className="preview py-5">
                <label className="text-sm font-semibold text-white">Transaction preview</label>
                <div className="text-xs py-2">
                  <span className="block font-semibold text-gray-300">Sender: {senderInfo?.address}</span>
                  <span className="block text-gray-400">Actual balance: { senderInfo?.balance } → New balance: { senderInfo?.balance - amount }</span>
                </div>

                <div className="text-xs py-2">
                  <span className="block font-semibold text-gray-300">Recipient: {recipientInfo?.address}</span>
                  <span className="block text-gray-400">Actual balance: { recipientInfo?.balance } → New balance: { recipientInfo?.balance + amount }</span>
                </div>
              </div>
            </>
          )
        }

        <button className="w-full block rounded-lg text-sm font-semibold py-3.5 bg-emerald-600 hover:bg-emerald-500 text-gray-200 hover:text-white transition shadow-sm text-shadow" onClick={submit}>Send funds</button>
      </div>
    </div>
  )

  return (
    <div className="app">
      <div className="container">
        Addresses
      </div>
      <Wallet
        balance={balance}
        setBalance={setBalance}
        address={address}
        setAddress={setAddress}
      />
      <Transfer setBalance={setBalance} address={address} />
    </div>
  );
}

export default App;
