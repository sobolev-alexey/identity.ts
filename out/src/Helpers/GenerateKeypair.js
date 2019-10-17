"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jrsa = require("jsrsasign");
var RSAKeypair_1 = require("../Encryption/RSAKeypair");
function GenerateRSAKeypair() {
    return new Promise(function (resolve, reject) {
        var rsaKeypair = jrsa.KEYUTIL.generateKeypair("RSA", 2048);
        var privateKey = jrsa.KEYUTIL.getPEM(rsaKeypair.prvKeyObj, "PKCS8PRV");
        var publicKey = jrsa.KEYUTIL.getPEM(rsaKeypair.pubKeyObj);
        resolve(new RSAKeypair_1.RSAKeypair(publicKey, privateKey));
    });
}
exports.GenerateRSAKeypair = GenerateRSAKeypair;
//# sourceMappingURL=GenerateKeypair.js.map