import { Location } from './location.ts';
import { Lexer, IdentToken } from './lexer.ts';

export interface Expr<T extends ExprNode = ExprNode> {
	location: Location,
	node: T
}

export type ExprNode = ExprNumber | ExprString | ExprBoolean | ExprVariable | ExprLambda | ExprTuple | ExprPipeline | ExprAssign | ExprMutate;

export type ExprNumber = ExprLiteral<number, "number">;
export type ExprBoolean = ExprLiteral<boolean, "boolean">;
export type ExprString = ExprLiteral<string, "string">;
export type ExprVariable = ExprLiteral<string, "variable">;
export type ExprTuple = ExprLiteral<Expr[], "tuple">;
interface ExprLiteral<T, Tag> {
	tag: Tag;
	value: T
}

export interface ExprLambda {
	tag: "lambda",
	args: Expr<ExprVariable>[],
	body: Expr
}

export type ExprPipeline = ExprBinary<Expr, Expr, "pipeline">;
export type ExprAssign = ExprBinary<Expr, Expr<ExprVariable>, "assign">;
export type ExprMutate = ExprBinary<Expr, Expr<ExprVariable>, "mutate">;
interface ExprBinary<A, B, Op> {
	tag: "binary",
	op: Op,
	lhs: A,
	rhs: B
}

function parse_variable(lexer: Lexer): Expr<ExprVariable> {
	const t = lexer.expect('identifier') as IdentToken;
	return {
		location: t.loc,
		node: { tag: 'variable', value: t.value }
	}
}

function parse_tuple(lexer: Lexer): Expr<ExprTuple> {
	const location = lexer.expect('lparen').loc;

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
		location,
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
	const location = lexer.expect('lparen').loc;
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
		location,
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
	else if (t.tag == 'boolean') {
		lexer.next();
		return {
			location: t.loc,
			node: { tag: 'boolean', value: t.value }
		}
	}
	else if (t.tag == 'number') {
		lexer.next();
		return {
			location: t.loc,
			node: { tag: 'number', value: t.value }
		};
	} else throw new Error(`expected a value, got ${t.tag}`);
}

export function parse_expr(lexer: Lexer): Expr {
	let p: Expr = parse_value(lexer);
	let t = lexer.some_peek();
	while (t !== null && t.tag != 'rparen' && t.tag != 'comma') {
		if (t.tag == 'pipeline') {
			lexer.next();
			p = {
				location: t.loc,
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
				location: t.loc,
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

export function print_ast(e: Expr) {
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
			if (idx == 0) return `${e.location.line}:${e.location.col}:${line}`;
			if (idx < last_index) return `\x1b[90m│\x1b[0m ${line}`;
			else if (idx == last_index) return `\x1b[90m╰\x1b[0m ${line}`;
			else return `  ${line}`;
		});
	}

	console.log(format(e).join('\n'));
}

