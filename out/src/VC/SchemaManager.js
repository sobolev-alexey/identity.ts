"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var Schema_1 = require("./Schema");
//TODO: Add DID's to trust
var SchemaManager = /** @class */ (function () {
    function SchemaManager() {
        var _this = this;
        this.schemas = [];
        //Load all default Schemas
        var folderPath = __dirname + "/Schemas";
        fs.readdir(folderPath, function (err, filePaths) {
            if (err)
                throw err;
            for (var i = 0; i < filePaths.length; i++) {
                var fileName = filePaths[i].substr(0, filePaths[i].lastIndexOf('.'));
                _this.AddSchemaFromFile(fileName, folderPath + "/" + filePaths[i]);
            }
        });
    }
    SchemaManager.prototype.AddSchemaFromFile = function (name, path, trustedDIDs) {
        var _this = this;
        fs.readFile(path, function (err, fileData) {
            if (err)
                throw err;
            _this.schemas.push(new Schema_1.Schema(name, JSON.parse(fileData.toString()), trustedDIDs));
        });
    };
    SchemaManager.prototype.AddSchema = function (name, layout, trustedDIDs) {
        this.schemas.push(new Schema_1.Schema(name, layout, trustedDIDs));
    };
    SchemaManager.prototype.GetSchema = function (name) {
        for (var i = 0; i < this.schemas.length; i++) {
            if (this.schemas[i].GetName() == name) {
                return this.schemas[i];
            }
        }
        return undefined;
    };
    SchemaManager.prototype.GetSchemaNames = function () {
        var _this = this;
        var schemaNames = [];
        if (!this.schemas.length) {
            var folderPath_1 = __dirname + "/Schemas";
            fs.readdir(folderPath_1, function (err, filePaths) { return __awaiter(_this, void 0, void 0, function () {
                var i, fileName;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (err)
                                throw err;
                            i = 0;
                            _a.label = 1;
                        case 1:
                            if (!(i < filePaths.length)) return [3 /*break*/, 4];
                            fileName = filePaths[i].substr(0, filePaths[i].lastIndexOf('.'));
                            return [4 /*yield*/, this.AddSchemaFromFile(fileName, folderPath_1 + "/" + filePaths[i])];
                        case 2:
                            _a.sent();
                            schemaNames.push(fileName);
                            _a.label = 3;
                        case 3:
                            i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/, schemaNames];
                    }
                });
            }); });
        }
        else {
            for (var i = 0; i < this.schemas.length; i++) {
                schemaNames.push(this.schemas[i].GetName());
            }
            return schemaNames;
        }
    };
    SchemaManager.GetInstance = function () {
        if (!SchemaManager.instance) {
            SchemaManager.instance = new SchemaManager();
        }
        return SchemaManager.instance;
    };
    return SchemaManager;
}());
exports.SchemaManager = SchemaManager;
//# sourceMappingURL=SchemaManager.js.map