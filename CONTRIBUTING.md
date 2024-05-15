# Contributing to Allen Institute for Cell Science Open Source

Thank you for your interest in contributing to this Allen Institute for Cell Science open source project! This document is
a set of guidelines to help you contribute to this project.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of
Conduct][code_of_conduct].

[code_of_conduct]: CODE_OF_CONDUCT.md

## Getting Started

1. To get up and running:

```cmd
npm install
npm run dev
```

1. To do all code static analysis checks: (DO THIS BEFORE PUSHING COMMITS)

```cmd
npm run lint
npm run typeCheck
```

1. Currently `npm run build-internal` is the only code path that results in a working deployment,
due to data being hosted only on internal servers.

## Project Documentation

The `README` in the root of the repository should contain or link to
project documentation. If you cannot find the documentation you're
looking for, please file a GitHub issue with details of what
you'd like to see documented.

## How to Contribute

1. Fork the repo on GitHub.

2. Create a branch and make your edits on your branch, pushing back to your fork.

3. Ensure that your changes are working, and that `npm run typeCheck`, `npm run test` and `npm run lint` all exit without errors. Add tests and documentation as needed.

4. Submit a pull request back to `main` via GitHub using the provided template. Include screenshots for visual changes.

## Publishing

1. Make a new version: `npm version [patch/minor/major]` -- this will give you the new tag, e.g., `2.7.1`
2. Push the new package.json version: `git push origin main`
3. Push the new tag: `git push origin [NEW_TAG]` -- e.g. `git push origin v2.7.1`
4. Write up [release notes](https://github.com/allen-cell-animated/nucmorph-colorizer/releases).
    - Select the tag
    - Click "generate release notes"
    - Use this template to summarize changes (delete any categories that aren't relevant). `## Pull requests included in this release` should be above the auto generated content:

```Markdown
## What's Changed

### **🎉 New features**   
    -
### **🐞 Bug Fixes**
    - 
### **⛏ Maintenance** 
    -
## Pull requests included in this release
```

## Questions or Thoughts?

Talk to us on [one of our community forums][community].

[community]: https://forum.allencell.org/
