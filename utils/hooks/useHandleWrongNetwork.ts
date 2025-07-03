import { useChainId, useSwitchChain } from 'wagmi'

const useHandleWrongNetwork = (customChainId: number) => {
    const currentChainId = useChainId()
    const { switchChainAsync } = useSwitchChain()
    const targetChainId = customChainId

    const handleWrongNetwork = async () => {
        if (currentChainId !== targetChainId) {
            try {
                await switchChainAsync({ chainId: targetChainId })
            } catch (error) {
                console.error('Failed to switch chain:', error)
                throw error
            }
        }
    }

    return handleWrongNetwork
}

export default useHandleWrongNetwork
