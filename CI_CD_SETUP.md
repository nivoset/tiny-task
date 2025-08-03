# CI/CD Setup Guide for Tiny-Task

This document provides a comprehensive guide for setting up and using the CI/CD pipeline for TinyTask.

## Overview

The CI/CD pipeline consists of three main workflows:

1. **CI Pipeline** (`.github/workflows/ci.yml`) - Runs on all branches and PRs
2. **Deploy Pipeline** (`.github/workflows/deploy.yml`) - Deploys to NPM on main branch pushes
3. **Release Pipeline** (`.github/workflows/release.yml`) - Handles releases when tags are pushed

## Workflow Details

### CI Pipeline

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` branch

**Jobs:**
- **Test Matrix**: Runs tests against Node.js 22.x
- **Security Audit**: Runs npm audit for security vulnerabilities

**Steps:**
1. Checkout code
2. Setup Node.js (matrix)
3. Install dependencies
4. Run linter
5. Run tests
6. Build project
7. Verify build output
8. Security audit

### Deploy Pipeline

**Triggers:**
- Push to `main` branch

**Jobs:**
- **Deploy**: Publishes to NPM

**Steps:**
1. Checkout code
2. Setup Node.js with NPM registry
3. Install dependencies
4. Run tests
5. Build project
6. Check if version already exists
7. Publish to NPM (if version doesn't exist)

### Release Pipeline

**Triggers:**
- Push tags matching `v*` pattern

**Jobs:**
- **Release**: Creates GitHub release and publishes to NPM

**Steps:**
1. Checkout code
2. Setup Node.js with NPM registry
3. Install dependencies
4. Run tests
5. Build project
6. Publish to NPM
7. Create GitHub release

## Setup Instructions

### 1. NPM Token Setup

1. Go to [NPM Settings](https://www.npmjs.com/settings)
2. Click on "Access Tokens"
3. Click "Generate New Token"
4. Select "Automation" token type
5. Copy the generated token

### 2. GitHub Secrets Setup

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add the following secrets:

   **NPM_TOKEN**
   - Name: `NPM_TOKEN`
   - Value: Your NPM automation token

### 3. Repository Configuration

Update the following fields in `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/YOUR_USERNAME/tiny-task.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/tiny-task/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/tiny-task#readme"
}
```

### 4. Environment Protection (Optional)

For additional security, you can set up environment protection:

1. Go to Settings → Environments
2. Create a new environment called "production"
3. Add protection rules:
   - Required reviewers
   - Wait timer
   - Deployment branches (restrict to main)

## Usage

### Automatic Deployment

Once set up, the pipeline will automatically:

- **On any push/PR**: Run CI checks
- **On main branch push**: Deploy to NPM
- **On tag push**: Create release and deploy

### Manual Release Process

For manual releases, use the release script:

```bash
# Patch release (1.0.0 → 1.0.1)
npm run release patch

# Minor release (1.0.0 → 1.1.0)
npm run release minor

# Major release (1.0.0 → 2.0.0)
npm run release major
```

The release script will:
1. Update version in package.json
2. Run tests
3. Build the project
4. Create git commit and tag
5. Provide instructions for pushing

### Manual NPM Publishing

If you need to publish manually:

```bash
# Update version
npm version patch  # or minor, major

# Build and test
npm run build
npm test

# Publish
npm publish
```

## Troubleshooting

### Common Issues

1. **NPM Token Issues**
   - Ensure the token has publish permissions
   - Check that the token is correctly set in GitHub secrets
   - Verify the registry URL in the workflow

2. **Version Conflicts**
   - The deploy workflow checks if a version already exists
   - If a version exists, the publish step will be skipped
   - Use `npm run release` to automatically bump versions

3. **Build Failures**
   - Check that all tests pass locally
   - Ensure TypeScript compilation succeeds
   - Verify that all dependencies are properly installed

4. **Permission Issues**
   - Ensure the GitHub Actions have write permissions
   - Check that the NPM package name is available
   - Verify that you're logged in to NPM with the correct account

### Debugging Workflows

1. Check the Actions tab in your GitHub repository
2. Click on the failed workflow run
3. Examine the logs for specific error messages
4. Test the failing step locally if possible

## Security Considerations

1. **NPM Token Security**
   - Use automation tokens, not personal access tokens
   - Set appropriate expiration dates
   - Rotate tokens regularly

2. **Environment Protection**
   - Use environment protection rules for production deployments
   - Require manual approval for critical deployments
   - Restrict deployment to specific branches

3. **Dependency Security**
   - The CI pipeline includes security audits
   - Regularly update dependencies
   - Monitor for security vulnerabilities

## Best Practices

1. **Version Management**
   - Use semantic versioning
   - Always test before releasing
   - Use the release script for consistency

2. **Code Quality**
   - Ensure all tests pass before merging
   - Fix linting issues promptly
   - Maintain good test coverage

3. **Documentation**
   - Update README.md with new features
   - Document breaking changes
   - Keep release notes up to date

## Support

If you encounter issues with the CI/CD pipeline:

1. Check the troubleshooting section above
2. Review the workflow logs in GitHub Actions
3. Test the failing steps locally
4. Create an issue in the repository with detailed error information 