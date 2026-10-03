// Packs the package with `npm pack`, installs the tarball into a throwaway
// consumer project and checks that every subpath export loads in plain Node
// ESM and type-checks under `moduleResolution: nodenext` and `bundler`.
// Run `bun run build` first (or use `bun run check:pack`).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))
const tscBin = join(rootDir, 'node_modules', '.bin', 'tsc')

// Named runtime exports each subpath must expose.
const expectedExports = {
	'.': [
		'Embed',
		'Webhook',
		'RateLimitError',
		'ValidationError',
		'WebhookError',
		'WebhookNotFoundError'
	]
}

const run = (command, args, cwd) =>
	execFileSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' })

const subpaths = typeof pkg.exports === 'object' ? Object.keys(pkg.exports) : ['.']
for (const subpath of subpaths) {
	if (!(subpath in expectedExports)) {
		throw new Error(`No expected exports listed for subpath "${subpath}" in check-pack.mjs`)
	}
}

if (!existsSync(join(rootDir, 'dist'))) {
	throw new Error('dist/ is missing, run `bun run build` first')
}

const workDir = mkdtempSync(join(tmpdir(), 'ez-hook-pack-'))
let failed = false

try {
	const packOutput = JSON.parse(
		run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', workDir], rootDir)
	)
	const tarball = join(workDir, packOutput[0].filename)
	console.log(`packed ${packOutput[0].filename} (${packOutput[0].entryCount} files)`)

	const consumerDir = join(workDir, 'consumer')
	run('mkdir', ['-p', consumerDir])
	writeFileSync(
		join(consumerDir, 'package.json'),
		JSON.stringify({ name: 'consumer', private: true, type: 'module' }, null, 2)
	)
	run(
		'npm',
		['install', '--no-audit', '--no-fund', '--ignore-scripts', '--no-package-lock', tarball],
		consumerDir
	)

	// Runtime: plain Node ESM import of every subpath.
	for (const subpath of subpaths) {
		const specifier = subpath === '.' ? pkg.name : `${pkg.name}/${subpath.slice(2)}`
		const names = expectedExports[subpath]
		const script = `
			const mod = await import(${JSON.stringify(specifier)})
			const missing = ${JSON.stringify(names)}.filter((name) => typeof mod[name] !== 'function')
			if (missing.length > 0) {
				console.error('missing exports: ' + missing.join(', '))
				process.exit(1)
			}
		`
		try {
			run('node', ['--input-type=module', '--eval', script], consumerDir)
			console.log(`ok   node import ${specifier}`)
		} catch (error) {
			failed = true
			console.error(`FAIL node import ${specifier}\n${error.stderr || error.message}`)
		}
	}

	// Types: consumer code compiled against the installed package.
	const imports = subpaths
		.map((subpath, index) => {
			const specifier = subpath === '.' ? pkg.name : `${pkg.name}/${subpath.slice(2)}`
			return `import * as mod${index} from ${JSON.stringify(specifier)}`
		})
		.join('\n')
	writeFileSync(
		join(consumerDir, 'index.ts'),
		`${imports}
import { Embed, Webhook, ValidationError } from ${JSON.stringify(pkg.name)}

const hook: Webhook = new Webhook('https://discord.com/api/webhooks/1/token')
const embed: Embed = new Embed().setTitle('hello')
hook.addEmbed(embed)
const error: Error = new ValidationError('x')
export { error, ${subpaths.map((_, index) => `mod${index}`).join(', ')} }
`
	)

	for (const [module, moduleResolution] of [
		['nodenext', 'nodenext'],
		['esnext', 'bundler']
	]) {
		try {
			run(
				tscBin,
				[
					'--noEmit',
					'--strict',
					'--skipLibCheck',
					'false',
					'--target',
					'esnext',
					'--lib',
					'esnext,dom',
					'--types',
					'',
					'--module',
					module,
					'--moduleResolution',
					moduleResolution,
					'index.ts'
				],
				consumerDir
			)
			console.log(`ok   types moduleResolution=${moduleResolution}`)
		} catch (error) {
			failed = true
			console.error(
				`FAIL types moduleResolution=${moduleResolution}\n${error.stdout || ''}${error.stderr || error.message}`
			)
		}
	}
} finally {
	rmSync(workDir, { recursive: true, force: true })
}

if (failed) {
	process.exit(1)
}
console.log('packed package loads in Node and resolves types')
