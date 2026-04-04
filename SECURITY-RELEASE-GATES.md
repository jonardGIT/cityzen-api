# Security Release Gates

This repository now includes explicit CI and deployment security gates intended to provide auditable release evidence for production changes.

## Required Checks

- `Security Checks` workflow
  Purpose: dependency review on pull requests, focused build-and-test validation, critical production dependency audit, and secret scanning.
- `CodeQL Analysis` workflow
  Purpose: static analysis for JavaScript and TypeScript on pull requests, protected branches, and a scheduled weekly run.
- `Deploy to Droplet` workflow
  Purpose: deployment to the main environment only after pre-deploy verification succeeds.

## What The Gates Validate

- `npm ci`
  Verifies the lockfile resolves cleanly in CI.
- `npm run build`
  Confirms the TypeScript project compiles successfully.
- `npm run build:production`
  Confirms a locked production feature profile can be generated and compiled.
- Focused tests
  Runs `featureSelection`, `health`, `startupEnv`, `auth-bootstrap`, `users`, `security`, and `incidents` coverage in CI against an ephemeral PostgreSQL service.
- `npm audit --omit=dev --audit-level=critical`
  Fails the gate for critical production dependency vulnerabilities.
- `dependency-review-action`
  Fails pull requests that introduce risky dependency changes.
- `gitleaks`
  Fails the workflow if repository history or the current tree includes detected secrets.
- `CodeQL`
  Produces static-analysis findings for review in GitHub security tooling.

## Deployment Expectation

- Branch protection should require `Security Checks` and `CodeQL Analysis` on `main` and `develop`.
- Deployment from `main` should remain blocked unless the `verify` job in `Deploy to Droplet` passes.
- Emergency overrides should be rare and documented with remediation follow-up.
