enum Direction {
	Left, Neutral, Right
}

declare interface String {
	trimQuotes(): string
}

String.prototype.trimQuotes = function (this : string) {return this.trim().replaceAll('"', '');};

let flatArrEq = (array1: any[], array2: any[]) => array1.length === array2.length && array1.every((value, index) => value === array2[index]);

class TuringMachine {
	numTapes: number;
	tapes: Uint16Array[];
	alphabet: string[];
	tapeAlphabet: string[];
	tapeAlphabetMap: Map<string, number>;
	states: number;
	stateTransitions: [[number, number, Direction][], number][][]
	stateLabels: string[];
	stateMap: Map<string, number>;
	acceptingStates: number[];
	blank: string;

	currentState: number;
	currentPosition: number[];

	constructor(s: string){
		this.parse(s);
	}

	parse(s: string){
		let lines = s.split("\n");
		this.numTapes = 1;
		this.alphabet = [];
		this.tapeAlphabet = [];
		this.acceptingStates = [];
		this.blank = "␣";

		let currentStateName = undefined;
		let startingStateName = undefined;
		let acceptingStateNames = [];
		let input = "";

		for (var i in lines){ // deliberate use of var
			let line = lines[i];
			if (line.trim().length == 0){
				continue;
			}
			if (line.startsWith("tapes")){
				this.numTapes = parseInt(line.split(":")[1]);
			} else if (line.startsWith("alphabet")) {
				if (this.alphabet.length != 0){
					throw new Error("alphabet already set");
				}

				this.alphabet = line.split(":")[1].trim().slice(1, -1).split(",").map(x => x.trimQuotes());
			} else if (line.startsWith("tapeAlphabet")) {
				if (this.tapeAlphabet.length != 0){
					throw new Error("tape alphabet already set");
				}
				
				let substring = line.split(":")[1].trim();
				if (substring.startsWith("+")){
					substring = substring.slice(1);
					this.tapeAlphabet = this.alphabet.slice();
					this.tapeAlphabet.push(...substring.slice(1, -1).split(",").map(x => x.trimQuotes()))
				}
			} else if (line.startsWith("blank")) {
				this.blank = line.split(":")[1].trimQuotes();
			} else if (line.startsWith("currentState")){
				currentStateName = line.split(":")[1].trimQuotes();
			} else if (line.startsWith("startingState")){
				startingStateName = line.split(":")[1].trimQuotes();
			} else if (line.startsWith("acceptingStates")){
				acceptingStateNames = line.split(":")[1].trim().slice(1, -1).split(",").map(x => x.trimQuotes());
			} else if (line.startsWith("table")){
				break;
			} else if (line.startsWith("input")){
				input = line.split(":")[1].trimQuotes();
			}  else if (line.indexOf(":") != -1){
				throw Error("unknown header");
			} else 
				throw Error("unknown format");
		}

		if (startingStateName === undefined){
			if (currentStateName === undefined)
				throw new Error("undefined starting state");
			else
				startingStateName = currentStateName;
		} else if (this.currentState == undefined) {
			this.currentState = startingStateName;
		}

		if (!lines[i].startsWith("table")){
			throw new Error("missing table");
		}

		let tapeAlphabetMap = new Map();
		let varBlank = this.tapeAlphabet.indexOf("blank");
		let blankIndex = this.tapeAlphabet.indexOf(this.blank);

		if (varBlank != -1){
			this.tapeAlphabet[varBlank] = this.tapeAlphabet[0];
		} else if (blankIndex != -1) {
			this.tapeAlphabet[blankIndex] = this.tapeAlphabet[0];
		} else
			throw new Error("missing blank symbol, you can just write blank into tape list")
		this.tapeAlphabet[0] = this.blank;

		for (let i = 0; i < this.tapeAlphabet.length; i++){
			if (tapeAlphabetMap.get(this.tapeAlphabet[i]) !== undefined) 
				throw new Error(`symbol "${this.tapeAlphabet[i]}" is already in tape Alphabet`);
			tapeAlphabetMap.set(this.tapeAlphabet[i], i);
		}

		tapeAlphabetMap.set("blank", 0);

		lines = lines.slice(parseInt(i) + 1);

		let temp = "";
		let parsingStateName = undefined;
		let tmpTransitions: [[number, number, Direction][], string][] = undefined;
		let stateNameMap = new Map();
		let stateNameList = [];
		let stateTransitionsNames: [[number, number, Direction][], string][][] = [];
		for (let i in lines){
			let line = lines[i];
			let index: number;
			if (line.trim().length == 0){
				continue;
			}
			if (line.startsWith("\t\t")) {
				if (parsingStateName === undefined) {
					throw Error("no state specified");
				}
				if (line.indexOf(":") != -1){
					line = line.trim();
					let split = line.split(":");
					let to = split[1].trimQuotes();
					let pre = split[0].trim();
					let body = pre;

					if (pre[0] == "["){
						body = body.slice(1, -1);
					}

					let stmts = body.split(";");
					if (stmts.length !== this.numTapes){
						throw new Error("wrong amount of stmts");
					}
					let main = stmts.map(function (x) {
						let split = x.split(/,|->/);
						let mapped = split.map(y => tapeAlphabetMap.get(y.trimQuotes()));
						if (split[1].trimQuotes() == "|") {
							mapped[1] = mapped[0];
						}

						let dir = split[2].trimQuotes();
						mapped[2] =  dir == "R" || dir == "r" ? Direction.Right : dir == "L" || dir == "l" ? Direction.Left : Direction.Neutral;
						return mapped;
					});
					
					tmpTransitions.push([main as [number, number, Direction][], to])
				}
			} else if (line.startsWith("\t") && (index = line.indexOf(":")) != -1 ){
				if (tmpTransitions !== undefined)
					stateTransitionsNames.push(tmpTransitions);
				parsingStateName = line.slice(1, index);
				stateNameMap.set(parsingStateName, stateNameList.length);
				stateNameList.push(parsingStateName);
				tmpTransitions = [];
			} else {
				throw new Error("unknown format");
			}
		}
		stateTransitionsNames.push(tmpTransitions);

		this.stateTransitions = stateTransitionsNames.map( x => x.map(([s, t]: [[number, number, Direction][], string]) => [s, stateNameMap.get(t)]))
		this.currentState = stateNameMap.get(currentStateName);
		this.acceptingStates = acceptingStateNames.map(x => stateNameMap.get(x));
		this.stateLabels = stateNameList;
		this.stateMap = stateNameMap;
		this.tapeAlphabetMap = tapeAlphabetMap;
		this.tapes = [];
		this.currentPosition = [];
		for (let i = 0; i < this.numTapes; i++){
			let arr = new Uint16Array(1028);
			this.currentPosition.push(512);
			this.tapes.push(arr);
		}
		for (let i = 0; i < input.length; i++){
			this.tapes[0][512 + i] = tapeAlphabetMap.get(input[i]);
		}
		return this;
	}

	nextStep(): boolean {
		let transitions = this.stateTransitions[this.currentState];
		let currentStates = this.currentPosition.map((val, ind) => this.tapes[ind][val]);

		let changed = false;

		for (let i of transitions){
			if (currentStates.every((val, ind) => i[0][ind][0] == val)){
				if (changed)
					throw new Error("not deterministic, you can convert it tho");
				let newValues = currentStates.map((_, ind) => i[0][ind][1]);
				let directions = currentStates.map((_, ind) => i[0][ind][2]);
				newValues.forEach((val, ind) => { this.tapes[ind][this.currentPosition[ind]] = val;});
				directions.forEach((val, ind) => { this.currentPosition[ind] += val == Direction.Left ? -1 : val == Direction.Right ? 1 : 0});
				this.currentState = i[1];
				changed = true;
			}
		}
		return changed;
	}

	run(render){
		let counter = 1;
		while(this.nextStep()){
			console.log(`tapes step ${counter}: state(${this.stateLabels[this.currentState]})`);
			render();
			counter += 1;
		}
	}

	showTapesCli(){
		for (let i = 0; i < this.tapes.length; i++){
			console.log(Array.from(this.tapes[i].slice(this.currentPosition[i] - 10, this.currentPosition[i] + 30)).map(x => this.tapeAlphabet[x]).join(" | "));
		}
	}

	deterministic(){
	}
}

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



let test = `
tapes: 2
alphabet: ["a", "b", "d"]
tapeAlphabet: +["c", blank]
currentState: stuff
acceptingStates: [end, other_end]
input: "aaaaaaaaa"
table:
	stuff:
		["a" -> "b", R; blank -> |, L]: stuff
		[blank -> "b", R; blank -> "a", R]: end
	end:
	other_end:
`

let tm = new TuringMachine(test)
tm.run();
console.log(tm)
