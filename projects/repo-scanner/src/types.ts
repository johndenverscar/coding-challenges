export enum Severity {
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low'
}

export interface ScanResult {
    file: string;
    line: number;
    match: string;
    type: string;
    severity: Severity
    context: string;
}

export interface ScanOptions {
    repo: string;
    owner: string;
    branch?: string;
    exclude?: string[];
}

export interface SecretPattern {
    name: string;
    pattern: RegExp;
    severity: Severity
}