import { Octokit } from 'octokit';

export class GitHubClient {
    private octokit: Octokit;

    constructor(token?: string) {
        this.octokit = new Octokit({
            auth: token || process.env.GITHUB_TOKEN
        });
    }

    async getRepoTree(owner: string, repo: string, branch = 'main') {
        try {
            // First, get the branch to get the commit SHA
            const { data: branchData } = await this.octokit.rest.repos.getBranch({
                owner,
                repo,
                branch
            });

            const treeSha = branchData.commit.commit.tree.sha;

            // Then get the tree recursively
            const { data } = await this.octokit.rest.git.getTree({
                owner,
                repo,
                tree_sha: treeSha,
                recursive: '1'
            });

            // Check if tree was truncated (GitHub limits recursive trees)
            if (data.truncated) {
                console.warn('⚠️  Warning: Repository tree was truncated. Some files may not be scanned.');
            }

            return data.tree || [];
        } catch (error: any) {
            if (error.status === 404) {
                throw new Error(`Repository ${owner}/${repo} not found or branch '${branch}' doesn't exist. Check the repo name and branch.`);
            }
            throw error;
        }
    }

    async getFileContent(owner: string, repo: string, path: string) {
        try {
            const { data } = await this.octokit.rest.repos.getContent({
                owner,
                repo,
                path
            });

            if ('content' in data && !Array.isArray(data)) {
                return Buffer.from(data.content, 'base64').toString('utf-8');
            }
            throw new Error('Not a file');
        } catch (error: any) {
            if (error.status === 404) {
                throw new Error(`File ${path} not found`);
            }
            throw error;
        }
    }
}