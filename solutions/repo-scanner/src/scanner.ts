import { GitHubClient } from "./github-client";
import { SECRET_PATTERNS } from "./patterns";
import { ScanResult, ScanOptions } from "./types";

export class SecretScanner {
    private githubClient: GitHubClient;
    private excludePatterns: RegExp[];

    constructor(token?: string, excludePatterns: RegExp[] = []) {
        this.githubClient = new GitHubClient(token);
        this.excludePatterns = excludePatterns;
    }

    setExcludePatterns(patterns: RegExp[]) {
        this.excludePatterns = patterns;
    }

    private shouldExclude(filePath: string): boolean {
        // Always exclude common non-scannable files
        const defaultExcludes = [
            /node_modules\//,
            /\.git\//,
            /dist\//,
            /build\//,
            /\.min\.js$/,
            /\.map$/,
            /package-lock\.json$/,
            /yarn\.lock$/
        ];

        return [...defaultExcludes, ...this.excludePatterns]
            .some(pattern => pattern.test(filePath));
    }

    async scanRepository(options: ScanOptions): Promise<ScanResult[]> {
        const results: ScanResult[] = [];
        const { owner, repo, branch = 'main' } = options;

        console.log(`Fetching repository tree for ${owner}/${repo}...`);
        const tree = await this.githubClient.getRepoTree(owner, repo, branch);

        const files = tree.filter((item: { path?: string, type?: string }) =>
            item.type === 'blob' && !this.shouldExclude(item.path! || '')
        );

        console.log(`Scanning ${files.length} files for secrets...`);
        for (const file of files) {
            if (!file.path) continue;

            try {
                const content = await this.githubClient.getFileContent(owner, repo, file.path);
                const fileResults = this.scanContent(content, file.path);
                results.push(...fileResults);
            } catch (error) {
                console.warn(`Failed to fetch or scan file ${file.path}: ${(error as Error).message}`);
            }
        }

        return results;
    }

    private scanContent(content: string, filePath: string): ScanResult[] {
        const results: ScanResult[] = [];
        const lines = content.split('\n');

        for (const pattern of SECRET_PATTERNS) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const matches = line.matchAll(pattern.pattern);
                for (const match of matches) {
                    results.push({
                        file: filePath,
                        line: i + 1,
                        match: match[0],
                        type: pattern.name,
                        severity: pattern.severity,
                        context: this.getContext(lines, i)
                    });
                }
            }
        }

        return results;
    }

    private getContext(lines: string[], lineIndex: number): string {
        const start = Math.max(0, lineIndex - 1);
        const end = Math.min(lines.length, lineIndex + 2);
        return lines.slice(start, end).join('\n');
    }
}