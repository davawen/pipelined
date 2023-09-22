export type Token = Lit<"lparen">
	| Lit<"rparen">
	| Lit<"arrow">
	| Lit<"pipeline">
	| Lit<"assign">
	| Lit<"mutate">
	| Lit<"comma">
	| Lit<"shorthand">
	| IdentToken
	| NumberToken;
export interface Lit<Tag> { tag: Tag }
export interface IdentToken {
	tag: "identifier",
	value: string
}
export interface NumberToken {
	tag: "number",
	value: number
}

export class Lexer {
	private tokens: Token[];

	constructor(input: string) {
		this.tokens = [];

		let i = 0;
		const next = (): string | null => {
			return input[i++] ?? null;
		};
		const peek = (n = 1): string | null => {
			return input[i+n-1] ?? null;
		}

		let id = "";
		const add_id = (x: string | null) => {
			if (x === null || x == " " || x == "\t" || x == "\n") return;
			id += x;
		}
		const flush_id = () => {
			if (id != "") {
				if (/\d/.test(id[0])) { // if you start with a digit
					if (id.match(/\d+(\.\d*)?/)?.at(0)?.length != id.length) {
						throw new Error("cannot start identifier name with number");
					}
					this.tokens.push({ tag: "number", value: parseFloat(id) });
				} else {
					this.tokens.push({ tag: "identifier", value: id })
				}

				id = "";
			}
		}

		const push_and_flush = (t: Token) => {
			flush_id();
			this.tokens.push(t);
		};

		let c;
		while ((c = next()) != null) {
			if (c == '(') push_and_flush({ tag: 'lparen' });
			else if (c == ')') push_and_flush({ tag: 'rparen' });
			else if (c == ',') push_and_flush({ tag: 'comma' });
			else if (c == '_' && id == "") push_and_flush({ tag: "shorthand" });
			else if (c == "=" && peek() == ">") {
				next();
				push_and_flush({ tag: 'arrow' });
			} else if (c == "|" && peek() == ">") {
				next();
				push_and_flush({ tag: 'pipeline' });
			} else if (c == "-" && peek() == ">" && peek(2) == ">") {
				next();
				next();
				push_and_flush({ tag: 'mutate' });
			} else if (c == "-" && peek() == ">") {
				next();
				push_and_flush({ tag: 'assign' });
			} else if (c == "-" && peek() == "-") { // comment
				next();
				flush_id();

				let n = next();
				while (n != '\n' && n != null) {
					n = next();
				}
			} else {
				add_id(c);
			}
		}

		flush_id();

		this.tokens.reverse();
	}

	show() {
		for (const token of this.tokens.toReversed()) {
			if (token.tag == 'identifier') {
				console.log(`ident: ${token.value}`);
			} else if (token.tag == 'number') {
				console.log(`number: ${token.value}`);
			} else {
				console.log(token.tag);
			}
		}
	}

	some_next(): Token | null {
		return this.tokens.pop() ?? null;
	}

	next(): Token {
		const t = this.some_next();
		if (t === null) throw new Error("finished token stream when expected more");
		return t;
	}

	some_peek(n = 1): Token | null {
		return this.tokens[this.tokens.length - n] ?? null;
	}

	peek(n = 1): Token {
		const t = this.some_peek(n);
		if (t === null) throw new Error("finished token streamed when exepected more");
		return t;
	}

	expect(expect: Token | Token['tag']): Token {
		const t = this.some_next();
		if (typeof expect == "string") {
			if (t?.tag != expect) {
				throw new Error(`expected token ${expect}, got ${t}`);
			}
		} else {
			if (t != expect) {
				throw new Error(`expected token ${expect.tag}, got ${t}`);
			}
		}
		return t;
	}
}
