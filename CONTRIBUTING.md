# Contributing to SmartClone Core

Thank you for your interest in contributing to SmartClone Core! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a new branch for your changes
5. Make your changes
6. Submit a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/smartclone-core.git
cd smartclone-core

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development mode with watch
npm run dev
```

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps to reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed and what you expected to see
- Include browser/environment information
- Add screenshots if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- Use a clear and descriptive title
- Provide a detailed description of the proposed enhancement
- Explain why this enhancement would be useful
- List any alternatives you've considered

### Pull Requests

1. **Create a branch**: Create a branch from `main` for your changes
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**: Follow our coding standards and ensure tests pass

3. **Commit your changes**: Use clear and meaningful commit messages
   ```bash
   git commit -m "Add feature: description of your changes"
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request**: Go to the original repository and create a pull request

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Ensure all tests pass and add new tests for new features
3. Update documentation for any changed functionality
4. Follow the pull request template
5. Request review from maintainers
6. Address any feedback from reviewers
7. Once approved, a maintainer will merge your PR

## Coding Standards

### TypeScript

- Use TypeScript for all source code
- Maintain strict type safety
- Add appropriate JSDoc comments for public APIs
- Follow existing code style and conventions

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Maximum line length of 100 characters
- Use meaningful variable and function names

### Example

```typescript
/**
 * Allocates resources based on device capabilities
 * @param options - Resource allocation options
 * @returns Resource allocation result
 */
export async function allocateResources(
  options: AllocationOptions
): Promise<AllocationResult> {
  // Implementation
}
```

## Testing Guidelines

- Write tests for all new features
- Ensure all tests pass before submitting a PR
- Aim for high code coverage
- Use descriptive test names

```typescript
describe('SmartClone', () => {
  it('should initialize with valid configuration', async () => {
    const sc = new SmartClone(validConfig);
    await expect(sc.initialize()).resolves.not.toThrow();
  });
});
```

## Commit Message Guidelines

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests when applicable

Examples:
```
Add hardware detection for Apple Silicon
Fix memory leak in resource allocation
Update README with new API examples
```

## Project Structure

```
smartclone-core/
├── src/              # Source code
├── tests/            # Test files
├── examples/         # Example usage
├── dist/             # Built files (generated)
└── docs/             # Documentation
```

## Questions?

Feel free to:
- Open an issue for questions
- Join our discussions on GitHub Discussions
- Review existing documentation

## License

By contributing to SmartClone Core, you agree that your contributions will be licensed under the Apache License 2.0.

---

Thank you for contributing to SmartClone Core!
