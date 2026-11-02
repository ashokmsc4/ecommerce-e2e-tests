#!/usr/bin/env bash
# Runs the site capture and the Chromium suite, then zips everything needed to tune the tests.
# Usage: npm run share   (produces tasawoq-results.zip in the repo root)
set -u
cd "$(dirname "$0")/.."
rm -rf site-snapshot playwright-report test-results tasawoq-results.zip
node scripts/capture-site.mjs 2>&1 | tee capture.log
npx playwright test --project=chromium --retries=0 --trace=retain-on-failure 2>&1 | tee test-run.log
zip -qr tasawoq-results.zip site-snapshot playwright-report test-results capture.log test-run.log -x '*.webm'
echo
echo "Done: $(pwd)/tasawoq-results.zip ($(du -h tasawoq-results.zip | cut -f1)). Upload it to the Claude thread."
