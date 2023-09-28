import { Lexer } from "./lexer.ts";
import { parse_expr, print_ast } from "./parser.ts";
import { interpret } from "./interpret/mod.ts";

// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {
	const input = `
    ((n) =>
        (0) -> i |> (
            () => (i, n) |> <,               -- conditional branch
            () => (i, 1) |> + ->> i |> show  -- mutate i
        ) |> loop
    ) -> shown |> (
        (10, 20) |> <,
        () => ("\\e[31m10 is smaller than 20 :)\\x1b[0m\\n\\n") |> show |> (10) |> shown
    ) |> if
	`;

	const _ = `
(3.1415926535) -> π |>
((radius) => ((radius, radius) |> *, π) |> *) -> area |>
((radius) => ((radius, 2) |> *, π) |> *) -> diameter |>
-- (10) -> r |> area |> show |> (r) |> diameter |> show
(20, 10, 15) |> > |> show
`;

	const lexer = new Lexer(input);

	console.log(`from input: \`${input}\``);

	const root = parse_expr(lexer);
	// print_ast(root);

	console.log("--- EXECUTING ---");
	interpret(root);
}
