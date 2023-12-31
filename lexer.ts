import { Location } from "./location.ts";

export type Token = Lit<"lparen">
	| Lit<"rparen">
	| Lit<"arrow">
	| Lit<"pipeline">
	| Lit<"assign">
	| Lit<"mutate">
	| Lit<"comma">
	| Lit<"shorthand">
	| IdentToken
	| NumberToken
	| StringToken
	| BooleanToken;

export interface Lit<Tag> {
	loc: Location,
	tag: Tag
}
export interface IdentToken {
	loc: Location,
	tag: "identifier",
	value: string
}
export interface NumberToken {
	loc: Location,
	tag: "number",
	value: number
}
export interface StringToken {
	loc: Location,
	tag: "string",
	value: string
}
export interface BooleanToken {
	loc: Location,
	tag: "boolean",
	value: boolean
}

export class Lexer {
	private tokens: Token[];

	constructor(input: string) {
		this.tokens = [];

		let i = 0;
		const loc: Location = { line: 1, col: 0 };
		const next_loc: Location = { line: 1, col: 1 };
		const next = (): string | null => {
			const c = input[i++] ?? null;

			loc.line = next_loc.line;
			loc.col = next_loc.col;

			if (c == '\n') {
				next_loc.line += 1;
				next_loc.col = 1;
			} else if (c != null) next_loc.col += 1;
			return c;
		};
		const peek = (n = 1): string | null => {
			return input[i+n-1] ?? null;
		}

		let id = "";
		const flush_id = () => {
			if (id != "") {
				if (/\d/.test(id[0])) { // if you start with a digit
					if (id.match(/\d+(\.\d*)?/)?.at(0)?.length != id.length) {
						throw new Error("cannot start identifier name with number");
					}
					this.tokens.push({ loc: Object.assign({}, loc), tag: "number", value: parseFloat(id) });
				} else if (id == "false" || id == "true") {
					this.tokens.push({ loc: Object.assign({}, loc), tag: 'boolean', value: id == "false" ? false : true })
				} else {
					this.tokens.push({ loc: Object.assign({}, loc), tag: "identifier", value: id })
				}

				id = "";
			}
		}

		const add_id = (c: string | null) => {
			if (c === null || c == " " || c == "\t" || c == "\n") return flush_id();
			id += c;
		}

		const push_and_flush = (t: Token) => {
			flush_id();
			this.tokens.push(t);
		};

		let str: string | null = null;
		const str_push_char = (c: string | null) => {
			if (c == null) throw new Error("input finished inside of string literal");
			else if (c == '\\') {
				c = next();
				if (c == null) throw new Error("input finished inside of escape sequence");
				else if (c == 'a') str += '\a';
				else if (c == 'b') str += '\b';
				else if (c == 'e') str += String.fromCharCode(0x1b);
				else if (c == 'f') str += '\f';
				else if (c == 'n') str += '\n';
				else if (c == 'r') str += '\r';
				else if (c == 't') str += '\t';
				else if (c == 'v') str += '\v';
				else if (c == '\\') str += '\\';
				else if (c == '"') str += '"';
				else if (c == 'x') {
					const [a, b] = [ next(), next() ];
					if (a == null || b == null) throw new Error("input finished inside of escape sequence");
					str += String.fromCharCode(parseInt(a + b, 16));
				}
				else throw new Error("unknown escape sequence");
			}
			else if (c == '"') {
				this.tokens.push({
					loc: Object.assign({}, loc),
					tag: 'string',
					value: str as string
				});
				str = null;
			} 
			else str += c;
		}

		let c;
		while ((c = next()) != null) {
			if (str != null) str_push_char(c);
			else if (c == '"') {
				flush_id();
				str = "";
			}
			else if (c == '(') push_and_flush({ loc: Object.assign({}, loc), tag: 'lparen' });
			else if (c == ')') push_and_flush({ loc: Object.assign({}, loc), tag: 'rparen' });
			else if (c == ',') push_and_flush({ loc: Object.assign({}, loc), tag: 'comma' });
			else if (c == '_' && id == "") push_and_flush({ loc: Object.assign({}, loc), tag: "shorthand" });
			else if (c == "=" && peek() == ">") {
				next();
				push_and_flush({ loc: Object.assign({}, loc), tag: 'arrow' });
			} else if (c == "|" && peek() == ">") {
				next();
				push_and_flush({ loc: Object.assign({}, loc), tag: 'pipeline' });
			} else if (c == "-" && peek() == ">" && peek(2) == ">") {
				next();
				next();
				push_and_flush({ loc: Object.assign({}, loc), tag: 'mutate' });
			} else if (c == "-" && peek() == ">") {
				next();
				push_and_flush({ loc: Object.assign({}, loc), tag: 'assign' });
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
			const loc = `${token.loc.line}:${token.loc.col}`;
			if (token.tag == 'identifier') {
				console.log(`${loc}:ident: ${token.value}`);
			} else if (token.tag == 'number') {
				console.log(`${loc}:number: ${token.value}`);
			} else {
				console.log(`${loc}:${token.tag}`);
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

	expect(expect: Token['tag']): Token & { tag: typeof expect } {
		const t = this.some_next();
		if (t?.tag != expect) {
			throw new Error(`expected token ${expect}, got ${t}`);
		}
		return t;
	}
}
