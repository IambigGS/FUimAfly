# Git Branching & GitHub Pages Directives

1. **Default Target Branch**:
   - All Git commits and pushes MUST target the **`main`** branch directly (`git push origin main`), unless otherwise explicitly requested by the user.
   - Do NOT create or push to `master`. The `master` branch has been permanently deleted.

2. **Automated CI/CD Deployment**:
   - Pushing to `main` automatically triggers the GitHub Actions workflow defined in `.github/workflows/deploy.yml`.
   - The workflow builds the production bundle and deploys it to the `gh-pages` branch for live hosting.
