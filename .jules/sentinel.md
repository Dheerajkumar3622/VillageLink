## 2025-05-15 - Hardcoded Credentials in Backend and Scripts
**Vulnerability:** Hardcoded MongoDB URI (with credentials), Razorpay Secret, and Fast2SMS API Key found directly in `server.js`, `backend/auth.js`, and `seed_real_data.js`.
**Learning:** Developers often hardcode fallbacks for convenience in local development or scripts, but these can easily leak into production or be committed to source control. The `seed_real_data.js` script containing production credentials is particularly risky as it might be shared or run in less secure environments.
**Prevention:** Strictly enforce loading configuration from environment variables. Fail fast (exit process) if required secrets are missing, rather than using hardcoded fallbacks. Use a linter or pre-commit hook to scan for secrets (like `trufflehog` or `gitleaks`) before committing.

## 2025-05-15 - .env File Committed to Git
**Vulnerability:** The `.env` file containing secrets was tracked by git and present in the repository.
**Learning:** Even with code changes to use environment variables, if the `.env` file itself is committed, the secrets are still exposed. This often happens when `.gitignore` is not set up correctly at the start of the project.
**Prevention:** Always ensure `.env` is in `.gitignore` before the first commit. Use tools like `git-secrets` to prevent committing files with sensitive patterns or filenames.
