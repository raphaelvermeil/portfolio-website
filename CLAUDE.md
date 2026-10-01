# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working principles

- **Simplest possible implementation, always.** Prefer the most straightforward solution that works. No speculative abstraction, no gold-plating.
- **Robust, but simple first.** The simple version must still be correct and reliable — simple does not mean fragile.
- **Ask before implementing edge cases.** Build the core happy path, then stop and ask before adding handling for edge cases, error branches, or extra scenarios.
- **Least amount of changes possible.** Make the smallest diff that accomplishes the task. Don't refactor, rename, or touch unrelated code unless asked.