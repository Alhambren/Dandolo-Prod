import { useAppKit, useAppKitAccount, useAppKitState } from '@reown/appkit/react'
import { useAccount, useSignMessage } from 'wagmi'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export function WalletConnectButton() {
  const { address } = useAccount()
  const { open } = useAppKit()
  const { signMessageAsync } = useSignMessage()
  const [isVerified, setIsVerified] = useState(false)

  // Check connection status and verify wallet ownership
  useEffect(() => {
    // Connection alone does not prove ownership - signature verification required
    if (address) {
      // For now, mark as connected but not verified
      // TODO: Implement proper wallet verification flow with challenge-response
      setIsVerified(false) // Changed: require proper verification
    } else {
      setIsVerified(false)
    }
  }, [address])

  const handleClick = async () => {
    if (address) {
      // Wallet is connected - open account modal for management
      open({ view: 'Account' })
    } else {
      // No wallet connected - open connection modal
      open()
    }
  }

  if (address) {
    return (
      <button
        onClick={handleClick}
        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
        title="Connected wallet - Click to manage"
      >
        ✓ {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
    >
      Connect Wallet
    </button>
  )
} 