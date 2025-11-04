import { ScanResult, Severity } from './types';

export class Reporter {
    static generateReport(results: ScanResult[]): void {
        if (results.length === 0) {
            console.log('\nNo secrets found!');
            return;
        }

        console.log(`\nFound ${results.length} potential secret(s):\n`);

        const grouped = this.groupBySeverity(results);

        for (const severity of [Severity.HIGH, Severity.MEDIUM, Severity.LOW]) {
            const items = grouped[severity];
            if (items.length === 0) continue;

            console.log(`${severity.toUpperCase()} SEVERITY (${items.length}):`);

            for (const result of items) {
                console.log(`\n  File: ${result.file}:${result.line}`);
                console.log(`  Type: ${result.type}`);
                console.log(`  Match: ${result.match}`);
                console.log(`  Context:\n${this.indent(result.context, 4)}`);
            }
            console.log('');
        }
    }

    private static groupBySeverity(results: ScanResult[]) {
        return {
            [Severity.HIGH]: results.filter(r => r.severity === Severity.HIGH),
            [Severity.MEDIUM]: results.filter(r => r.severity === Severity.MEDIUM),
            [Severity.LOW]: results.filter(r => r.severity === Severity.LOW)
        };
    }

    private static indent(text: string, spaces: number): string {
        const padding = ' '.repeat(spaces);
        return text.split('\n').map(line => padding + line).join('\n');
    }
}