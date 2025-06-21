import { useAppKit, useAppKitAccount, useAppKitState } from '@reown/appkit/react'
import { useAccount, useSignMessage } from 'wagmi'
import { useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export function WalletConnectButton() {
  const { address } = useAccount()
  const { open } = useAppKit()
  const { signMessageAsync } = useSignMessage()
  const verifyWallet = useMutation(api.wallets.verifyWallet)
  const [isVerified, setIsVerified] = useState(false)

  // Auto-verification disabled to prevent popup on page load
  // Users can manually verify when needed
  useEffect(() => {
    // Only check if we have an address but skip auto-verification
    if (address) {
      // Could add logic here to check if already verified in storage
      // For now, we'll let users manually verify when they need provider features
    }
  }, [address])

  const handleVerification = async () => {
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
      }
    } else {
      // Just open wallet modal for account management
      open()
    }
  }

  if (address) {
    return (
      <button
        onClick={handleVerification}
        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
          isVerified 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        title={isVerified ? 'Wallet verified - Click to manage' : 'Click to verify wallet'}
      >
        {isVerified && '✓ '}{address.slice(0, 6)}...{address.slice(-4)}
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