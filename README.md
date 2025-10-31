# SmartClone Core

[![npm version](https://badge.fury.io/js/smartclone-core.svg)](https://www.npmjs.com/package/smartclone-core)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Build Status](https://github.com/yourusername/smartclone-core/workflows/CI/badge.svg)](https://github.com/yourusername/smartclone-core/actions)

A lightweight library providing hardware-adaptive AI scaling in browsers with hybrid storage capabilities and progressive feature enhancement.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Browser Support](#browser-support)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Hardware-adaptive AI scaling**: Automatically adjusts AI complexity based on detected hardware capabilities
- **Hybrid local storage**: Combined vector, graph, and relational storage with zero-knowledge encryption
- **Progressive enhancement**: Gradual activation of AI features based on device capability
- **Zero-knowledge encryption**: Client-side encryption for privacy-first AI applications
- **Edge computing**: Run AI workloads locally in the browser
- **TypeScript support**: Full type definitions included

## Installation

```bash
npm install smartclone-core
```

Or using yarn:

```bash
yarn add smartclone-core
```

## Quick Start

```typescript
import SmartClone from 'smartclone-core';

// Initialize SmartClone
const sc = new SmartClone({
  models: {
    small: { path: 'models/tiny.onnx' },
    medium: { path: 'models/medium.onnx' },
    large: { path: 'models/large.onnx' }
  }
});

await sc.initialize();

// Get device capabilities
const capabilities = await sc.getCapabilities();
console.log('Device capabilities:', capabilities);
```

## API Reference

### Initialization

```typescript
const sc = new SmartClone(options);
await sc.initialize();
```

### Device Capabilities

```typescript
const capabilities = await sc.getCapabilities();
```

Returns information about the device's hardware capabilities including CPU, GPU, and memory.

### Resource Allocation

```typescript
const allocation = await sc.allocateResources({
  taskType: 'inference',
  priority: 'balanced'
});
```

Allocates resources for AI tasks based on device capabilities.

### Storage

```typescript
// Store vector data with encryption
const id = await sc.store([0.1, 0.2, 0.3], {
  type: 'vector',
  metadata: { source: 'text' }
});

// Retrieve data
const data = await sc.retrieve(id);
```

### Feature Detection

```typescript
if (await sc.isFeatureEnabled('image-recognition')) {
  // Use image recognition feature
}
```

## Examples

Check the [examples](./examples) directory for complete examples:

- Basic usage
- Advanced configuration
- Integration with popular frameworks

## Browser Support

SmartClone Core supports all modern browsers:

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.

## Support

- Documentation: [GitHub Wiki](https://github.com/yourusername/smartclone-core/wiki)
- Issues: [GitHub Issues](https://github.com/yourusername/smartclone-core/issues)
- Discussions: [GitHub Discussions](https://github.com/yourusername/smartclone-core/discussions)
