import { NETWORK_ID, NODE } from './config/config';
import provider from './config/provider';

/**
 * 
 * @param delayInMs the number of milliseconds to delay
 * @returns a promise that resolves after the given number of milliseconds
 */
export async function delay(delayInMs) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, delayInMs);
    });
}

export async function blockfrostRequest(endpoint, headers = {}, body) {
    const network = {
        id: NETWORK_ID.mainnet,
        node: NODE.mainnet,
    }
    return fetch(provider.api.base(network.node) + endpoint, {
        headers: {
            ...provider.api.key(network.id),
            ...headers,
            'User-Agent': 'faucet',
            'Cache-Control': 'no-cache',
        },
        method: body ? 'POST' : 'GET',
        body,
    }).then(response => response.json());
}
