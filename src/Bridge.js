import React from 'react'
import { Tab, Tabs, RadioGroup, Radio, FormGroup, InputGroup, NumericInput } from "@blueprintjs/core";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import {
    Address,
    BaseAddress,
    MultiAsset,
    Assets,
    ScriptHash,
    Costmdls,
    Language,
    CostModel,
    AssetName,
    TransactionUnspentOutput,
    TransactionUnspentOutputs,
    TransactionOutput,
    Value,
    TransactionBuilder,
    TransactionBuilderConfigBuilder,
    TransactionOutputBuilder,
    LinearFee,
    BigNum,
    BigInt,
    TransactionHash,
    TransactionInputs,
    TransactionInput,
    TransactionWitnessSet,
    Transaction,
    PlutusData,
    PlutusScripts,
    PlutusScript,
    PlutusList,
    Redeemers,
    Redeemer,
    RedeemerTag,
    Ed25519KeyHashes,
    ConstrPlutusData,
    ExUnits,
    Int,
    NetworkInfo,
    EnterpriseAddress,
    TransactionOutputs,
    hash_transaction,
    hash_script_data,
    hash_plutus_data,
    ScriptDataHash, Ed25519KeyHash, NativeScript, StakeCredential
} from "@emurgo/cardano-serialization-lib-asmjs"
import "./Bridge.css";
import {blake2b} from "blakejs"
import { Unity, useUnityContext } from "react-unity-webgl"
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { Box, textAlign } from '@mui/system'
import { theme } from './App'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { useEffect, useState } from 'react'
import { toHex, hexDecode, unpackAssets } from './utils'
import { blockfrostRequest } from './API'

let Buffer = require('buffer/').Buffer
let blake = require('blakejs')


function Bridge()
{
    /* Holds the name of the user's selected wallet */
    const [whichWalletSelected, setWhichWalletSelected] = useState(undefined)
    /* Holds the status of whether the selected wallet matches a wallet on the user's browser */
    const [walletFound, setWalletFound] = useState(false)
    /* Holds the API version of the found wallet */
    const [walletAPIVersion, setWalletAPIVersion] = useState(undefined)
    /* Holds the name of the found wallet */
    const [walletName, setWalletName] = useState(undefined)
    /* Holds the status of whether the found wallet has been enabled by the user */
    const [walletIsEnabled, setWalletIsEnabled] = useState(false)
    /* Holds the array of native assets stored in the found wallet */
    const [nativeAssets, setNativeAssets] = useState([])
    /* Holds the used address of the found wallet */
    const [usedAddress, setUsedAdress] = useState([])

    /* Don't touch please <3 */
    var API = undefined

    /* Imports necessary react-unity-webgl functions and sets unity files */
    const { unityProvider, loadingProgression, isLoaded, addEventListener, removeEventListener, sendMessage, requestFullscreen } = useUnityContext({
        // File location for WebGL files, should be placed in the top level build folder
        // INFO: "undefined character '<'" errors are usually caused by an incorrect directory for these files
        loaderUrl: "./WebGL.loader.js",
        dataUrl: "./WebGL.data",
        frameworkUrl: "./WebGL.framework.js",
        codeUrl: "./WebGL.wasm",
    })

    /* Detects when the unity file, WalletSelect, sends a message to Bridge.js requesting to call the 
    handleWalletSelect function */
    useEffect(() => {
        /* This is the function unity calls when a wallet is selected within the game */
        const handleWalletSelect = (val) => {
            setWhichWalletSelected(val)
        }
        addEventListener("WalletSelect", handleWalletSelect)
        return () => {
          removeEventListener("WalletSelect", handleWalletSelect)
        };
    }, [addEventListener, removeEventListener])

    function setAssets(assetMetadata) {
        console.log('Setting Assets: ', assetMetadata)
        sendMessage("Bridge", "SetAssetsValue", assetMetadata)
    }

    function setWalletAddress(address) {
        console.log('Setting Wallet Address: ', address)
        sendMessage("Bridge", "SetWalletAddress", address)
    }

    useEffect(() => {
        const sendMetadata = async () => {
            const rawAssets = nativeAssets

            const assetsWithMetadata = []

            for (let i = 0; i < rawAssets.length; i++) {
                const asset = rawAssets[i]
                const unit = toHex(asset.hash.to_bytes()) + toHex(asset.assetName.name())
                let metadata = await blockfrostRequest(`/assets/${unit}`)
                assetsWithMetadata.push({
                    asset: {
                        assetName: hexDecode(asset.assetName.name()),
                        amount: asset.amount.to_str()
                    },
                    metadata: metadata
                })
            }

            setAssets(JSON.stringify(assetsWithMetadata))
        }
        sendMetadata()
    }, [nativeAssets])

    useEffect(() => {
        setWalletAddress(usedAddress)
    }, [usedAddress])

    /* Detects when the whichWalletSelected variable has changed and begins wallet connection process */
    useEffect(() => {
        /* Checks is the selected wallet matches a wallet in the user's browser */
        const checkIfWalletFound = () => {
            const walletKey = whichWalletSelected
            // returns true if WalletKey is found in the user's active brower
            const walletFound = !!window?.cardano?.[walletKey]
            setWalletFound(walletFound)
            return walletFound
        }

        /**
         * Get the API version used by the wallets
         * and store the value
         * @returns {*}
         */
        const getAPIVersion = () => {
            const walletKey = whichWalletSelected
            // gets api version from wallet browser extension
            const walletAPIVersion = window?.cardano?.[walletKey].apiVersion
            setWalletAPIVersion(walletAPIVersion)
            return walletAPIVersion
        }

        /**
         * Get the name of the wallet (nami, eternl, flint, etc)
         * and store the name
         * @returns {*}
         */
        const getWalletName = () => {
            const walletKey = whichWalletSelected
            // gets wallet name from wallet browser extension
            const walletName = window?.cardano?.[walletKey].name
            setWalletName(walletName)
            return walletName
        } 

        /**
         * Checks if a connection has been established with
         * the wallet
         * @returns {Promise<boolean>}
         */
        const checkIfWalletEnabled = async () => {
            let walletIsEnabled = false;
    
            try {
                const walletName = whichWalletSelected;
                walletIsEnabled = await window.cardano[walletName].isEnabled();
            } catch (err) {
                console.log(err)
            }

            setWalletIsEnabled(walletIsEnabled)
            return walletIsEnabled
        }    
        
        /**
         * Enables the wallet that was chosen by the user
         * When this executes the user should get a window pop-up
         * from the wallet asking to approve the connection
         * of this app to the wallet
         * @returns {Promise<boolean>}
         */
        const enableWallet = async () => {
            const walletKey = whichWalletSelected
            try {
                API = await window.cardano[walletKey].enable()
            } catch(err) {
                console.log(err)
            }
            return checkIfWalletEnabled()
        }        

        /**
         * Gets the UTXOs from the user's wallet and then
         * stores in an object
         * @returns {Promise<void>}
         */
        const getUtxos = async () => {
            console.log("starting utxo process")

            let utxos = []

            var allUnpackedAssets = []

            try {
                const rawUtxos = await API.getUtxos()

                for (const rawUtxo of rawUtxos) {
                    const utxo = TransactionUnspentOutput.from_bytes(Buffer.from(rawUtxo, "hex"))
                    const allNativeAssets = utxo.output().amount()
                    const unpackedNativeAssets = unpackAssets(allNativeAssets)
                    allUnpackedAssets = allUnpackedAssets.concat(unpackedNativeAssets)
                }

                setNativeAssets(allUnpackedAssets)
            } catch (err) {
                console.log(err)
            }
        }

        const getUsedAddresses = async () => {
            try {
                const raw = await API.getUsedAddresses()
                const rawFirst = raw[0]
                const usedAddress = Address.from_bytes(Buffer.from(rawFirst, "hex")).to_bech32()
                setUsedAdress(usedAddress)
                console.log(usedAddress)
            } catch (err) {
                console.log(err)
            }
        }

        /**
         * Refresh all the data from the user's wallet
         * @returns {Promise<void>}
         */
        const refreshData = async () => {
            try {
                const walletFound = checkIfWalletFound()
                if (walletFound) {
                    console.log("Found " + await getWalletName() + " Wallet, version " + await getAPIVersion())
                    console.log("Waiting for user to enable wallet...")
                    const walletEnabled = await enableWallet()
                    if (walletEnabled) {
                        console.log("Wallet enabled")
                        await getUsedAddresses()
                        await getUtxos()
                        // if (nativeAssets.length) {
                        //     await sendMetadata()
                        // } else {
                        //     console.log("native assets: " + nativeAssets)
                        // }
                    } else {
                        console.log("Wallet not enabled")
                    }
                    
                }
    
            } catch (err) {
                console.log(err)
            }
        }

        console.log("selected Wallet: " + whichWalletSelected)
        refreshData()
        
    }, [whichWalletSelected])

    function handleClickEnterFullscreen() {
        requestFullscreen(true)
      }

    return (
        <ThemeProvider theme={theme}>
            <Container maxWidth="lg" sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
            }}>
                <CssBaseline />
                    {/* displays loading progress only when game is loading */}
                    {!isLoaded && (
                        <Typography variant="h6" sx={{ textAlign: "center" }}>
                            Loading Game... {Math.round(loadingProgression * 100)}%
                        </Typography>
                        
                    )}
                    <Unity 
                        unityProvider={unityProvider}
                        style={{ 
                            visibility: isLoaded ? "visible" : "hidden",
                            height: 600,
                            width: 960,
                            backgroundColor: 'darkgray',
                        }}     
                    />
                    <Button sx={{
                        width: 200,
                    }} variant="contained"  onClick={handleClickEnterFullscreen}>Enter Fullscreen</Button>
            </Container>    
        </ThemeProvider>
        
    )
}

export default Bridge
