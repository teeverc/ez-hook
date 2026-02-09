# Contributing to ez-hook

Thank you for your interest in contributing to ez-hook! This document provides guidelines and information for contributors.

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 18+
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/ez-hook.git
   cd ez-hook
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or with other package managers:
   # npm install
   # yarn install
   # pnpm install
   ```

3. **Run tests to ensure everything works**
   ```bash
   bun test
   ```

## 🛠️ Development Workflow

### Available Scripts

- **Development**
  - `bun run dev` - Run the main entry point
  - `bun run dev:watch` - Watch mode for development
  - `bun run example` - Run enhanced usage example
  - `bun run example:basic` - Run basic usage example

- **Code Quality**
  - `bun run lint` - Run linting only
  - `bun run format` - Format code
  - `bun run check` - Lint and format (auto-fix)
  - `bun run check:ci` - Check without auto-fixing (for CI)
  - `bun run typecheck` - Type checking

- **Testing**
  - `bun test` - Run all tests
  - `bun run test:watch` - Run tests in watch mode
  - `bun run test:coverage` - Run tests with coverage

- **Build**
  - `bun run build` - Build the project
  - `bun run build:watch` - Build in watch mode
  - `bun run clean` - Clean build artifacts

- **Validation**
  - `bun run validate` - Run all checks (typecheck + lint + test)

### Git Hooks

This project uses [Lefthook](https://github.com/evilmartians/lefthook) for Git hooks:

- **Pre-commit**: Automatically formats code with Biome
- **Pre-push**: Runs validation checks

## 📋 Contribution Guidelines

### Code Style

- We use [Biome](https://biomejs.dev/) for linting and formatting
- TypeScript strict mode is enabled
- Follow existing code patterns and conventions
- Write clear, self-documenting code

### Commit Messages

We follow conventional commit format:

```
<type>: <description>

[optional body]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style/formatting
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Build process, tools, dependencies

**Examples:**
```bash
feat: add retry mechanism for failed webhook requests
fix: handle network timeout errors gracefully
docs: update API documentation with new examples
```

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following the existing patterns
   - Add tests for new functionality
   - Update documentation if needed

3. **Validate your changes**
   ```bash
   bun run validate
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: your descriptive commit message"
   ```

5. **Push and create a PR**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Fill out the PR template** with:
   - Clear description of changes
   - Link to any related issues
   - Screenshots (if applicable)
   - Testing instructions

### Testing Guidelines

- **Write tests for new features** - Every new feature should have corresponding tests
- **Test edge cases** - Consider error conditions, invalid inputs, network failures
- **Keep tests focused** - Each test should validate one specific behavior
- **Use descriptive test names** - Test names should clearly describe what they're testing

**Test Structure:**
```typescript
import { test, expect } from "bun:test";

test("should handle network timeout gracefully", async () => {
  // Arrange
  const webhook = new EzHook("test-url");
  
  // Act & Assert
  await expect(webhook.send(data)).rejects.toThrow("Network timeout");
});
```

### Documentation

- Update `README.md` for user-facing changes
- Update `docs.md` for API changes
- Add JSDoc comments for new public methods
- Include practical examples in documentation

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected behavior** vs actual behavior
4. **Environment details** (Node.js/Bun version, OS)
5. **Code samples** that demonstrate the issue

## 💡 Feature Requests

For feature requests:

1. **Describe the problem** you're trying to solve
2. **Propose a solution** with examples
3. **Consider backwards compatibility**
4. **Discuss implementation approach** if complex

## 🤝 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow the project's coding standards

## 📞 Getting Help

- **Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Code Review**: All PRs will be reviewed for quality and consistency

## 🏆 Recognition

Contributors will be recognized in:
- Release notes for significant contributions
- Project documentation
- GitHub contributors page

Thank you for contributing to ez-hook! 🎉