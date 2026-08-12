# react-incremental-funnel

TypeScript-first React package for building incremental funnel flows with a small public runtime API and exported types.

## Installation

```bash
npm install react-incremental-funnel
```

## Usage

```ts
import {
  createFunnel,
  advanceFunnel,
  useIncrementalFunnel,
  type FunnelStep
} from 'react-incremental-funnel';

const steps: FunnelStep<'welcome' | 'details' | 'confirm'>[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'details', label: 'Details' },
  { id: 'confirm', label: 'Confirm' }
];

const initial = createFunnel(steps);
const next = advanceFunnel(initial, 'details');

// in React components
const funnel = useIncrementalFunnel(steps);
```

## Development

```bash
npm install
npm run lint
npm run test
npm run build
```

## Public API

- `createFunnel`
- `advanceFunnel`
- `useIncrementalFunnel`
- `FunnelStep`, `FunnelState`, `UseIncrementalFunnelResult`, `FunnelStepId`
