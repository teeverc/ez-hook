import { brotliCompressSync, gzipSync } from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { extname, join } from 'node:path'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const distDir = fileURLToPath(new URL('../dist', import.meta.url))
const entryPath = new URL('../dist/index.js', import.meta.url)
const entryBuffer = readFileSync(entryPath)

const collectRuntimeFiles = (directory) => {
	const files = []

	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const fullPath = join(directory, entry.name)

		if (entry.isDirectory()) {
			files.push(...collectRuntimeFiles(fullPath))
			continue
		}

		if (entry.isFile() && extname(entry.name) === '.js') {
			files.push(fullPath)
		}
	}

	return files
}

const runtimeFiles = collectRuntimeFiles(distDir)
const runtimeBytes = runtimeFiles.reduce((total, filePath) => total + statSync(filePath).size, 0)

const packOutput = execFileSync(
	'npm',
	['pack', '--dry-run', '--json', '--ignore-scripts'],
	{
		cwd: rootDir,
		encoding: 'utf8'
	}
)

const [packInfo] = JSON.parse(packOutput)

const formatBytes = (bytes) => {
	if (bytes < 1000) {
		return `${bytes} B`
	}

	return `${(bytes / 1000).toFixed(1)} kB`
}

const metrics = [
	['Entry stub (raw)', entryBuffer.byteLength],
	['Entry stub (gzip)', gzipSync(entryBuffer).byteLength],
	['Entry stub (brotli)', brotliCompressSync(entryBuffer).byteLength],
	['Published runtime JS', runtimeBytes],
	['npm tarball', packInfo.size],
	['npm unpacked', packInfo.unpackedSize]
]

console.log('Bundle size metrics for @teever/ez-hook')

for (const [label, bytes] of metrics) {
	console.log(`- ${label}: ${formatBytes(bytes)} (${bytes} bytes)`)
}
