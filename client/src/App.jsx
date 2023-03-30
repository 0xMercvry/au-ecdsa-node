
import "./App.css";
import { useEffect, useState } from "react";
import server from "./server";
import { keccak256 } from 'ethereum-cryptography/keccak'
import { utf8ToBytes, toHex } from 'ethereum-cryptography/utils'
import {sign} from 'ethereum-cryptography/secp256k1'
import toast, { Toaster } from 'react-hot-toast';

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
        name={id}
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
    setAmount(parseInt(amount))
  }

  const submit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    const recipientPublicKey = _getPublicInfoFromAddress(recipient)?.address

    const [signature, recoveryBit] = await signMessage(`${recipientPublicKey}${amount}`, sender)

    console.log(`Sending data to server:\n--------------------\nrecipient: ${recipientPublicKey}\namount: ${amount}\nsignature: ${ toHex(signature)}\nrecovery bit: ${recoveryBit}`)

    try {
      const {data} = await server.post('/send', {
        recipient: recipientPublicKey,
        amount,
        signature: toHex(signature),
        recoveryBit
      })
      toast.success(`Successfully sent ${data.amount} to ${recipientPublicKey}`)
    } catch (err) {
      toast.error(err?.response?.data?.error)
    }
    setIsLoading(false)
    setSender()
    setRecipient()
    setAmount(0)
  }

  const _getPublicInfoFromAddress = (addr) => {
    if (!addr) return null
    for (let x = 0; x < wallets.length; x++) {
      if (addr === wallets[x].privateKey) {
        return { address: wallets[x].publicKey, balance: wallets[x].balance }
      }
    }
  }

  useEffect(() => {
    loadWallets()
  }, [])

  const senderInfo = _getPublicInfoFromAddress(sender)
  const recipientInfo = _getPublicInfoFromAddress(recipient)

  return (
    <div className="bg-slate-950 flex">
      <div className="w-1/4 bg-slate-700 h-auto mx-auto my-10 rounded-xl py-7 px-8">
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

        <button className="w-full flex justify-center block rounded-lg text-sm font-semibold py-3.5 bg-emerald-600 hover:bg-emerald-500 text-gray-200 hover:text-white transition shadow-sm text-shadow" onClick={submit}>
          { isLoading ?
            <div role="status">
                <svg aria-hidden="true" className="inline w-4 h-4 mr-2 text-emerald-800 animate-spin fill-emerald-200" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                </svg>
                <span className="sr-only">Loading...</span>
            </div> : ''
          }
          Send funds
        </button>
      </div>
      <Toaster />
    </div>
  )
}

export default App;
