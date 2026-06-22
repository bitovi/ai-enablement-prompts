---
name: debugging
description: Always start a fresh browser session after any file change, walk through the full user flow, and monitor for errors before proceeding with further work.
---

# Debugging Skill: Error-Free UI Verification

## Purpose
Ensure that after any code change, the app is fully reloaded, the user flow is tested from the beginning, and no runtime errors or warnings are present before continuing.

## Workflow

1. **Restart Browser Session**
   - After any file change or hot-reload, always start a new browser session
   - Do not reuse previous state

2. **Walk Through Full User Flow**
   - Begin at the login page (unless login bypass is enabled)
   - Navigate to the target page
   - Interact with the UI as a real user would

3. **Monitor for Errors and Warnings**
   - Capture all browser console logs, errors, and exceptions
   - Do not proceed if any runtime errors or warnings are present
   - Only continue when the UI is confirmed error-free

4. **Bypass Login for Debugging (Optional)**
   - If an environment flag is set to bypass login, skip authentication
   - This makes debugging and E2E testing faster

## Best Practices
- Always verify the UI is in a clean state before testing features
- Use Playwright or similar tools to automate the flow and error monitoring
- Document any errors found and fix them before proceeding
