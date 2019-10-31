const jrsa = require("jsrsasign");
import { RSAKeypair } from "../Encryption/RSAKeypair";

export function GenerateRSAKeypair(length = 2048) : Promise<RSAKeypair> {
    return new Promise<RSAKeypair>(async resolve => {
        const rsaKeypair = await jrsa.KEYUTIL.generateKeypair("RSA", length);
        const privateKey = await jrsa.KEYUTIL.getPEM(rsaKeypair.prvKeyObj, "PKCS8PRV");
        const publicKey = await jrsa.KEYUTIL.getPEM(rsaKeypair.pubKeyObj);
        resolve(new RSAKeypair(publicKey, privateKey));
    });
}