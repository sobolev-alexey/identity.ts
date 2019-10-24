"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var Proof = /** @class */ (function () {
    function Proof(signMethod, verifySignatureMethod, proofParameter, proofDocument) {
        this.signMethod = signMethod;
        this.verifySignatureMethod = verifySignatureMethod;
        this.issuer = proofParameter.issuer;
        this.keypair = this.issuer.GetKeypair(proofParameter.issuerKeyId);
        this.challengeNonce = proofParameter.challengeNonce;
        this.proofDocument = proofDocument;
    }
    Proof.prototype.Sign = function (JSONToSign) {
        var finalJSON = JSONToSign;
        if (this.challengeNonce) {
            finalJSON = __assign(__assign({}, finalJSON), { "nonce": this.challengeNonce });
        }
        var document = this.signMethod(finalJSON, this.keypair);
        this.proofDocument = __assign(__assign({}, document), {
            created: new Date().toUTCString(),
            creator: this.issuer.GetDID().GetDID(),
            nonce: this.challengeNonce
        });
    };
    Proof.prototype.VerifySignature = function (JSONToVerify) {
        var finalJSON = JSONToVerify;
        if (this.challengeNonce) {
            finalJSON = __assign(__assign({}, finalJSON), { "nonce": this.challengeNonce });
        }
        return this.verifySignatureMethod(finalJSON, this.keypair, this.proofDocument);
    };
    Proof.prototype.EncodeToJSON = function () {
        return this.proofDocument;
    };
    ;
    Proof.prototype.GetIssuer = function () {
        return this.issuer;
    };
    return Proof;
}());
exports.Proof = Proof;
//# sourceMappingURL=Proof.js.map