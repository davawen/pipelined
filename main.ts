import { IdentToken, NumberToken, Token } from "./lexer.ts";
import { Lexer } from "./lexer.ts";

interface Location {
	line: number;
	col: number;
	file: string;
}

function location_default(): Location {
	return {
		line: 0,
		col: 0,
		file: "TODO: LOCATION"
	}
}

interface Expr<T extends ExprNode = ExprNode> {
	location: Location,
	node: T
}

type ExprNode = ExprInt | ExprString | ExprVariable | ExprLambda | ExprTuple | ExprPipeline | ExprAssign | ExprMutate;

type ExprInt = ExprLiteral<number, "int">;
type ExprString = ExprLiteral<string, "string">;
type ExprVariable = ExprLiteral<string, "variable">;
type ExprTuple = ExprLiteral<Expr[], "tuple">;
interface ExprLiteral<T, Tag> {
	tag: Tag;
	value: T
}

interface ExprLambda {
	tag: "lambda",
	args: Expr<ExprVariable>[],
	body: Expr
}

type ExprPipeline = ExprBinary<Expr, Expr, "pipeline">;
type ExprAssign = ExprBinary<Expr, Expr<ExprVariable>, "assign">;
type ExprMutate = ExprBinary<Expr, Expr<ExprVariable>, "mutate">;
interface ExprBinary<A, B, Op> {
	tag: "binary",
	op: Op,
	lhs: A,
	rhs: B
}

function parse_variable(lexer: Lexer): Expr<ExprVariable> {
	const t = lexer.expect('identifier') as IdentToken;
	return {
		location: location_default(),
		node: { tag: 'variable', value: t.value }
	}
}

function parse_tuple(lexer: Lexer): Expr<ExprTuple> {
	lexer.expect('lparen');

	const value: Expr[] = [];
	if (lexer.peek().tag != 'rparen') {
		value.push(parse_expr(lexer));
		while (lexer.peek().tag == 'comma') {
			lexer.next();
			value.push(parse_expr(lexer));
		}
	}
	lexer.expect('rparen');

	return {
		location: location_default(),
		node: {
			tag: 'tuple',
			value
		}
	}
}

function is_lambda(lexer: Lexer): boolean {
	let n = 1
	if(lexer.peek(n++).tag != 'lparen') return false;

	let depth = 1;
	while (depth > 0) {
		const t = lexer.peek(n++);
		if (t.tag == 'lparen') depth += 1;
		else if (t.tag == 'rparen') depth -= 1;
	}

	return lexer.some_peek(n)?.tag == 'arrow';
}

function parse_lambda(lexer: Lexer): Expr<ExprLambda> {
	lexer.expect('lparen');
	const args: Expr<ExprVariable>[] = [];
	if (lexer.peek().tag != 'rparen') {
		args.push(parse_variable(lexer));
		while (lexer.peek().tag == 'comma') {
			lexer.next();
			args.push(parse_variable(lexer));
		}
	}
	lexer.expect('rparen');
	lexer.expect('arrow');

	const body = parse_expr(lexer);

	return {
		location: location_default(),
		node: {
			tag: 'lambda',
			args, body
		}
	}
}

function parse_tuple_or_lambda(lexer: Lexer): Expr<ExprTuple | ExprLambda> {
	if (is_lambda(lexer)) return parse_lambda(lexer);
	else return parse_tuple(lexer);
}

function parse_value(lexer: Lexer): Expr {
	const t = lexer.peek();

	if (t.tag == 'lparen') return parse_tuple_or_lambda(lexer);
	else if (t.tag == 'identifier') return parse_variable(lexer);
	else if (t.tag == 'number') {
		lexer.next();
		return {
			location: location_default(),
			node: { tag: 'int', value: t.value }
		};
	} else throw new Error("no expression");
}

function parse_expr(lexer: Lexer): Expr {
	let p: Expr = parse_value(lexer);
	let t = lexer.some_peek();
	while (t !== null && t.tag != 'rparen' && t.tag != 'comma') {
		if (t.tag == 'pipeline') {
			lexer.next();
			p = {
				location: location_default(),
				node: {
					tag: 'binary',
					op: 'pipeline',
					lhs: p,
					rhs: parse_value(lexer)
				}
			}
		} else if (t.tag == 'assign' || t.tag == 'mutate') {
			lexer.next();
			p = {
				location: location_default(),
				node: {
					tag: 'binary',
					op: t.tag,
					lhs: p,
					rhs: parse_variable(lexer)
				}
			}
		} else throw new Error("invalid expression");

		t = lexer.some_peek();
	}

	return p;
}

// function rotate(e: Expr): Expr {
// 	if (e.node.tag == 'binary') {
//
// 	}
// }

function show(e: Expr) {
	function format(e: Expr): string[] {
		let s: string[] = [];
		let last_index = 0;

		if (e.node.tag == "binary") {
			s.push(`${e.node.op}:`);
			s.push(...format(e.node.lhs));
			last_index = s.length;
			s.push(...format(e.node.rhs));
		} else if (e.node.tag == "tuple") {
			s.push(`tuple: (`);
			for (const x of e.node.value) {
				last_index = s.length;
				s.push(...format(x));
			}
			s.push('\x1b[2D)');
		} else if (e.node.tag == 'lambda') {
			s.push(`lambda (${e.node.args.map(a => a.node.value).join(", ")}):`);
			last_index = 1;
			s.push(...format(e.node.body));
		} else {
			s = [`${e.node.tag}: ${e.node.value}`];
		}

		return s.map((line, idx) => {
			if (idx == 0) return line;
			if (idx < last_index) return `\x1b[90m│\x1b[0m ${line}`;
			else if (idx == last_index) return `\x1b[90m╰\x1b[0m ${line}`;
			else return `  ${line}`;
		});
	}

	console.log(format(e).join('\n'));
}


// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {
	const _ = `
	((s) =>
		(0) -> i |> (
			() => (i, 10) |> <,              -- conditional branch
			() => (i, 1) |> + ->> i |> show  -- mutate i
		) |> loop
	) -> show10
`;

	const input = `
(3.1415926535) -> π |>
((radius) => ((radius, radius) |> *, π) |> *) -> area |>
((radius) => ((radius, 2) |> *, π) |> *) -> diameter
`;

	const lexer = new Lexer(input);
	// lexer.show();
	const root = parse_expr(lexer);

	console.log(`from input: \`${input}\``);
	show(root);
}
