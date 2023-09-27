import { Lexer } from "./lexer.ts";
import { Expr, parse_expr, print_ast } from "./parser.ts";

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

	console.log(`from input: \`${input}\``);
	lexer.show();

	const root = parse_expr(lexer);
	print_ast(root);
}
