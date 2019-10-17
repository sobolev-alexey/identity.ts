const jrsa = require("jsrsasign");
import { RSAKeypair } from "../Encryption/RSAKeypair";

export function GenerateRSAKeypair() : Promise<RSAKeypair> {
    return new Promise<RSAKeypair>((resolve, reject) => {
        const rsaKeypair = jrsa.KEYUTIL.generateKeypair("RSA", 2048);
        const privateKey = jrsa.KEYUTIL.getPEM(rsaKeypair.prvKeyObj, "PKCS8PRV")
        const publicKey = jrsa.KEYUTIL.getPEM(rsaKeypair.pubKeyObj)
        resolve(new RSAKeypair(publicKey, privateKey));
    });
}
