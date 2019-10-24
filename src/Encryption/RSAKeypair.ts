const crypto = require('crypto');
import { BaseKeypair } from './BaseKeypair';

export const passphrase : string = 'Semantic Market runs on IOTA! @(^_^)@';

export class RSAKeypair extends BaseKeypair {

    constructor(publicKey : string, privateKey ?: string) {
        super();
        this.publicKey = publicKey;
        this.privateKey = (privateKey)?privateKey:undefined;
    }
    
    public PublicEncrypt(message: string): Buffer {
        return crypto.publicEncrypt({key: this.publicKey, padding: 1}, Buffer.from(message));
    }   

    //These two functions dont seem useful as Sign and Verify should take care of this.

    /*public async PublicDecrypt(input: string): Promise<string> {
        return crypto.publicDecrypt({key : this.publicKey, padding: 1}, Buffer.from(input)).toString();
    }*/

    /*public async PrivateEncrypt(message: string): Promise<Buffer> {
        if(!this.privateKey) {
            console.log("Warning: Encryption with private key called, without a private key accessible\n");
            return new Buffer("");
        }
            
        return crypto.privateEncrypt({key: this.privateKey, passphrase: passphrase, padding: 1}, Buffer.from(message));
    }*/

    public PrivateDecrypt(input : Buffer): string {
        if(!this.privateKey) {
            console.log("Warning: Decryption with private key called, without a private key accessible\n");
            return "";
        }
        return crypto.privateDecrypt({key: this.privateKey, passphrase: passphrase, padding: 1}, input).toString();
    }
    
    public Sign(dataToSign: string): Buffer {
        if(!this.privateKey)
            return undefined;
        const signer : any = crypto.createSign('RSA-SHA256');
        signer.update(dataToSign);
        signer.end();
        return signer.sign({key: this.privateKey, passphrase: passphrase, padding: 1});
    }

    public Verify(dataToCheck: string, signatureToVerify: Buffer): boolean {
        const verifier : any = crypto.createVerify('RSA-SHA256');
        verifier.update(dataToCheck);
        verifier.end();
        return verifier.verify(this.publicKey, signatureToVerify);
    }

    public GetKeyType(): string {
        return "RsaVerificationKey2018";
    };
}