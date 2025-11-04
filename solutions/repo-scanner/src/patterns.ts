import { SecretPattern, Severity } from './types';

export const SECRET_PATTERNS: SecretPattern[] = [
    // AWS
    {
        name: 'AWS Access Key ID',
        pattern: /AKIA[0-9A-Z]{16}/g,
        severity: Severity.HIGH
    },
    {
        name: 'AWS Secret Key',
        pattern: /aws(.{0,20})?['\"][0-9a-zA-Z\/+]{40}['\"]/gi,
        severity: Severity.HIGH
    },

    // Database Connection Strings
    {
        name: 'MongoDB Connection String',
        pattern: /mongodb(\+srv)?:\/\/[^\s]+/gi,
        severity: Severity.HIGH
    },
    {
        name: 'PostgreSQL Connection String',
        pattern: /postgres(ql)?:\/\/[^\s]+/gi,
        severity: Severity.HIGH
    },
    {
        name: 'MySQL Connection String',
        pattern: /mysql:\/\/[^\s]+/gi,
        severity: Severity.HIGH
    },

    // API Keys
    {
        name: 'Generic API Key',
        pattern: /api[_-]?key['\"]?\s*[:=]\s*['\"]([0-9a-zA-Z\-_]{20,})['\"]?/gi,
        severity: Severity.HIGH
    },

    // GitHub
    {
        name: 'GitHub Token',
        pattern: /gh[pousr]_[0-9a-zA-Z]{36}/g,
        severity: Severity.HIGH
    },

    // Private Keys
    {
        name: 'RSA Private Key',
        pattern: /-----BEGIN RSA PRIVATE KEY-----/g,
        severity: Severity.HIGH
    },
    {
        name: 'SSH Private Key',
        pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g,
        severity: Severity.HIGH
    },

    // Slack
    {
        name: 'Slack Token',
        pattern: /xox[baprs]-[0-9a-zA-Z\-]+/g,
        severity: Severity.HIGH
    },

    // Stripe
    {
        name: 'Stripe API Key',
        pattern: /sk_live_[0-9a-zA-Z]{24}/g,
        severity: Severity.HIGH
    },

    // Generic Passwords
    {
        name: 'Generic Password',
        pattern: /password['\"]?\s*[:=]\s*['\"]([^'\"]{8,})['\"]?/gi,
        severity: Severity.MEDIUM
    }
];