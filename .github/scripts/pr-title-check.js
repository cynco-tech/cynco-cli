// Validates PR title format: type(scope)?: description
// Examples:
//   feat: add --cc flag
//   fix(invoices): handle empty response
//   chore: bump dependencies

const title = process.argv[2];

if (!title) {
	console.error('error: no PR title provided');
	process.exit(1);
}

const pattern = /^(feat|fix|chore|refactor|docs|test|perf|ci)(\([a-zA-Z0-9-]+\))?:\s[a-z0-9].*$/;

if (!pattern.test(title)) {
	console.error(`\nerror: PR title does not match the required format\n`);
	console.error(`  Got:      "${title}"`);
	console.error(`  Expected: type(scope)?: description\n`);
	console.error(`  Types:    feat, fix, chore, refactor, docs, test, perf, ci`);
	console.error(`  Scope:    optional, e.g. (invoices), (auth)`);
	console.error(`  Description must start with a lowercase letter or number\n`);
	console.error(`  Examples:`);
	console.error(`    feat: add webhook retry support`);
	console.error(`    fix(auth): handle expired tokens`);
	console.error(`    chore: bump dependencies\n`);
	process.exit(1);
}

console.log(`PR title is valid: "${title}"`);
