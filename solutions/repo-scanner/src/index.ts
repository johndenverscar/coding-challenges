import { Command } from 'commander';
import { SecretScanner } from './scanner';
import { Reporter } from './reporter';
import * as dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
    .name('github-secret-scanner')
    .description('Scan GitHub repositories for exposed secrets')
    .version('1.0.0');

program
    .command('scan')
    .description('Scan a GitHub repository')
    .requiredOption('-o, --owner <owner>', 'Repository owner')
    .requiredOption('-r, --repo <repo>', 'Repository name')
    .option('-b, --branch <branch>', 'Branch to scan', 'main')
    .option('-t, --token <token>', 'GitHub token (or use GITHUB_TOKEN env)')
    .option('-c, --concurrency <number>', 'Number of concurrent file requests', '10')
    .action(async (options) => {
        try {
            const concurrency = parseInt(options.concurrency, 10);
            const scanner = new SecretScanner(options.token, [], concurrency);

            console.log(`Starting scan of ${options.owner}/${options.repo}/${options.branch}...`);

            const results = await scanner.scanRepository({
                owner: options.owner,
                repo: options.repo,
                branch: options.branch
            });

            Reporter.generateReport(results);

            // Exit with error code if secrets found
            process.exit(results.length > 0 ? 1 : 0);
        } catch (error) {
            console.error('Error:', error);
            process.exit(1);
        }
    });

program.parse(process.argv);