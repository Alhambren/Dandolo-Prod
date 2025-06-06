import { useAppKit } from '@reown/appkit/react'
import { useAccount, useDisconnect, useSignMessage } from 'wagmi'
import { useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export function WalletConnectButton() {
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const { open } = useAppKit()
  const { signMessageAsync } = useSignMessage()
  const verifyWallet = useMutation(api.wallets.verifyWallet)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    const verifyConnection = async () => {
      if (address && !isVerified) {
        try {
          const nonce = Math.random().toString(36).substring(7)
          const timestamp = new Date().toISOString()
          const message = `domain: dandolo.ai\naddress: ${address}\nnonce: ${nonce}\nissuedAt: ${timestamp}`
          
          const signature = await signMessageAsync({ message })
          
          await verifyWallet({
            address,
            msg: message,
            signature
          })
          
          setIsVerified(true)
          toast.success("Wallet verified!")
        } catch (error) {
          toast.error("Wallet verification failed")
          disconnect()
        }
      }
    }
    
    verifyConnection()
  }, [address, isVerified, signMessageAsync, verifyWallet, disconnect])

  if (address) {
    return (
      <button
        onClick={() => disconnect()}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    )
  }

  return (
    <button
      onClick={() => open()}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
    >
      Connect Wallet
    </button>
  )
} 