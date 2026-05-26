## Summary

<!-- What does this PR do? 1-3 bullet points. -->

-

## Checklist

- [ ] `npx nx run-many -t lint` passes
- [ ] `npx nx run-many -t test --projects=ports` passes
- [ ] `npx nx build web` succeeds
- [ ] Changes follow architecture rules (features → ports only, no adapter imports)
- [ ] New UI uses `@spartan-ng/helm/*` primitives and signal APIs
- [ ] No hardcoded strings — Transloco keys for user-facing text

## Test plan

<!-- How did you verify this works? Manual steps, E2E, unit tests? -->

-

## Related issues

<!-- Closes #123 -->
