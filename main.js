var Direction;
(function (Direction) {
    Direction[Direction["Left"] = 0] = "Left";
    Direction[Direction["Neutral"] = 1] = "Neutral";
    Direction[Direction["Right"] = 2] = "Right";
})(Direction || (Direction = {}));
String.prototype.trimQuotes = function () { return this.trim().replaceAll('"', ''); };
var TuringMachine = /** @class */ (function () {
    function TuringMachine(s) {
        this.parse(s);
    }
    TuringMachine.prototype.parse = function (s) {
        var _a;
        var lines = s.split("\n");
        this.numTapes = 1;
        this.alphabet = [];
        this.tapeAlphabet = [];
        this.acceptingStates = [];
        this.blank = "␣";
        var currentStateName = undefined;
        var startingStateName = undefined;
        var acceptingStateNames = [];
        var input = "";
        for (var i in lines) { // deliberate use of var
            var line = lines[i];
            if (line.trim().length == 0) {
                continue;
            }
            if (line.startsWith("tapes")) {
                this.numTapes = parseInt(line.split(":")[1]);
            }
            else if (line.startsWith("alphabet")) {
                if (this.alphabet.length != 0) {
                    throw new Error("alphabet already set");
                }
                this.alphabet = line.split(":")[1].trim().slice(1, -1).split(",").map(function (x) { return x.trimQuotes(); });
            }
            else if (line.startsWith("tapeAlphabet")) {
                if (this.tapeAlphabet.length != 0) {
                    throw new Error("tape alphabet already set");
                }
                var substring = line.split(":")[1].trim();
                if (substring.startsWith("+")) {
                    substring = substring.slice(1);
                    this.tapeAlphabet = this.alphabet.slice();
                    (_a = this.tapeAlphabet).push.apply(_a, substring.slice(1, -1).split(",").map(function (x) { return x.trimQuotes(); }));
                }
            }
            else if (line.startsWith("blank")) {
                this.blank = line.split(":")[1].trimQuotes();
            }
            else if (line.startsWith("currentState")) {
                currentStateName = line.split(":")[1].trimQuotes();
            }
            else if (line.startsWith("startingState")) {
                startingStateName = line.split(":")[1].trimQuotes();
            }
            else if (line.startsWith("acceptingStates")) {
                acceptingStateNames = line.split(":")[1].trim().slice(1, -1).split(",").map(function (x) { return x.trimQuotes(); });
            }
            else if (line.startsWith("table")) {
                break;
            }
            else if (line.startsWith("input")) {
                input = line.split(":")[1].trimQuotes();
            }
            else if (line.indexOf(":") != -1) {
                throw Error("unknown header");
            }
            else
                throw Error("unknown format");
        }
        if (startingStateName === undefined) {
            if (currentStateName === undefined)
                throw new Error("undefined starting state");
            else
                startingStateName = currentStateName;
        }
        else if (this.currentState == undefined) {
            this.currentState = startingStateName;
        }
        if (!lines[i].startsWith("table")) {
            throw new Error("missing table");
        }
        var tapeAlphabetMap = new Map();
        var varBlank = this.tapeAlphabet.indexOf("blank");
        var blankIndex = this.tapeAlphabet.indexOf(this.blank);
        if (varBlank != -1) {
            this.tapeAlphabet[varBlank] = this.tapeAlphabet[0];
        }
        else if (blankIndex != -1) {
            this.tapeAlphabet[blankIndex] = this.tapeAlphabet[0];
        }
        else
            throw new Error("missing blank symbol, you can just write blank into tape list");
        this.tapeAlphabet[0] = this.blank;
        for (var i_1 = 0; i_1 < this.tapeAlphabet.length; i_1++) {
            if (tapeAlphabetMap.get(this.tapeAlphabet[i_1]) !== undefined)
                throw new Error("symbol \"".concat(this.tapeAlphabet[i_1], "\" is already in tape Alphabet"));
            tapeAlphabetMap.set(this.tapeAlphabet[i_1], i_1);
        }
        lines = lines.slice(parseInt(i) + 1);
        var temp = "";
        var parsingStateName = undefined;
        var tmpTransitions = undefined;
        var stateNameMap = new Map();
        var stateNameList = [];
        var stateTransitionsNames = [];
        for (var i_2 in lines) {
            var line = lines[i_2];
            var index = void 0;
            if (line.trim().length == 0) {
                continue;
            }
            if (line.startsWith("\t\t")) {
                if (parsingStateName === undefined) {
                    throw Error("no state specified");
                }
                if (line.indexOf(":") != -1) {
                    line = line.trim();
                    var split = line.split(":");
                    var to = split[1].trimQuotes();
                    var pre = split[0].trim();
                    var body = pre;
                    if (pre[0] == "[") {
                        body = body.slice(1, -1);
                    }
                    var stmts = body.split(";");
                    if (stmts.length !== this.numTapes) {
                        throw new Error("wrong amount of stmts");
                    }
                    var main = stmts.map(function (x) {
                        var split = x.split(/,|->/);
                        var mapped = split.map(function (y) { return tapeAlphabetMap.get(y.trimQuotes()); });
                        if (split[1].trimQuotes() == "|") {
                            mapped[1] = mapped[0];
                        }
                        var dir = split[2].trimQuotes();
                        mapped[2] = dir == "R" || dir == "r" ? Direction.Right : dir == "L" || dir == "l" ? Direction.Left : Direction.Neutral;
                        return mapped;
                    });
                    tmpTransitions.push([main, to]);
                }
            }
            else if (line.startsWith("\t") && (index = line.indexOf(":")) != -1) {
                if (tmpTransitions !== undefined)
                    stateTransitionsNames.push(tmpTransitions);
                parsingStateName = line.slice(1, index);
                stateNameMap.set(parsingStateName, stateNameList.length);
                stateNameList.push(parsingStateName);
                tmpTransitions = [];
            }
            else {
                throw new Error("unknown format");
            }
        }
        stateTransitionsNames.push(tmpTransitions);
        this.stateTransitions = stateTransitionsNames.map(function (x) { return x.map(function (_a) {
            var s = _a[0], t = _a[1];
            return [s, stateNameMap.get(t)];
        }); });
        this.currentState = stateNameMap.get(currentStateName);
        this.acceptingStates = acceptingStateNames.map(function (x) { return stateNameMap.get(x); });
        this.stateLabels = stateNameList;
        this.stateMap = stateNameMap;
        this.tapeAlphabetMap = tapeAlphabetMap;
        this.tapes = [];
        for (var i_3 = 0; i_3 < this.numTapes; i_3++) {
            var arr = new Uint16Array(1028);
            this.tapes.push(arr);
        }
        console.log(this, this.stateTransitions[0]);
        return this;
    };
    TuringMachine.prototype.next_step = function () {
        var transitions = this.stateTransitions[this.currentState];
    };
    TuringMachine.prototype.deterministic = function () {
    };
    return TuringMachine;
}());
/*
 * Syntax:
 *
 * tapes: 2
 * alphabet: ["a", "b", "c", "d"]
 * blank: " "
 * accepting_states: stateNew
 * start: stateName
 *
 * table:
 * 	stateName:
 * 		["a": "a", R; "b": "c", R]: stateNew
 * 		["b": "b", N; "d": "c", L]: stateNew
 * 		["c" | , N; "d" | , N]: |
 * 		["a": "c", R; "c": |, N],
 * 		["d"|, N; "c: |,N"]: stateName
 * 	stateNew:
 * 		["b": "a", R; "c": "d", L]: stateName
 *
 */
var test = "\ntapes: 2\nalphabet: [\"a\", \"b\", \"d\"]\ntapeAlphabet: +[\"c\", blank]\ncurrentState: stuff\nacceptingStates: [end, other_end]\ntable:\n\tstuff:\n\t\t[\"a\" -> \"b\", R; \"d\" -> |, L]: stuff\n\tend:\n\tother_end:\n";
new TuringMachine(test);
