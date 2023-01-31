import { Buffer } from "buffer"

/**
 * @param {UInt8Array} s 
 * @returns Decoded as a string
 */
export function toHex(s) {
    return Buffer.from(s).toString("hex")
}

/**
 * @param {string} s 
 * @returns Decoded as a string
 */
export function hexDecode(s) {
    return Buffer.from(s, "hex").toString()
}

/**
 * @param value the value from which to find all native assets
 * @returns all native assets in that value
 */
export function unpackAssets(value) {
    const multiAsset = value.multiasset()
    if (multiAsset) {
        const hashes = multiAsset.keys()
        const newNativeAssets = []
        for (let i = 0; i < hashes.len(); i++) {
            const hash = hashes.get(i)
            const assets = multiAsset.get(hash)
            if (assets) {
                const assetNames = assets.keys()
                for (let i = 0; i < assetNames.len(); i++) {
                    const assetName = assetNames.get(i)
                    const amount = assets.get(assetName)
                    if (amount) {
                        newNativeAssets.push({ assetName: assetName, amount: amount, hash: hash })
                    }
                }
            }
        }
        // console.log(newNativeAssets)
        return newNativeAssets
    }
    return []
}